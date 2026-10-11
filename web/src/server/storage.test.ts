import { afterEach, describe, expect, it, vi } from "vitest";
import { PhotoError, savePhoto } from "./storage";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

function supabaseEnv() {
  vi.stubEnv("STORAGE_DRIVER", "supabase");
  vi.stubEnv("SUPABASE_URL", "https://proj.supabase.co/");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-key");
  vi.stubEnv("SUPABASE_STORAGE_BUCKET", "photos");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("savePhoto on Supabase Storage", () => {
  it("uploads with the service key and returns the public URL", async () => {
    supabaseEnv();
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const url = await savePhoto(PNG);

    expect(url).toMatch(/^https:\/\/proj\.supabase\.co\/storage\/v1\/object\/public\/photos\/[0-9a-f-]{36}\.png$/);
    const [target, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(target).toBe(url.replace("/object/public/", "/object/"));
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({ Authorization: "Bearer service-key", "Content-Type": "image/png" });
    expect(new Uint8Array(init.body as Buffer)).toEqual(PNG);
  });

  it("fails loudly when the upload is refused", async () => {
    supabaseEnv();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Bucket not found", { status: 404 })));
    await expect(savePhoto(PNG)).rejects.toThrow(/upload failed \(404\): Bucket not found/);
  });

  it("names the missing settings", async () => {
    vi.stubEnv("STORAGE_DRIVER", "supabase");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    await expect(savePhoto(PNG)).rejects.toThrow(/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY/);
  });
});

describe("savePhoto checks", () => {
  it("rejects a file that isn't an image before any upload", async () => {
    supabaseEnv();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(savePhoto(new Uint8Array([1, 2, 3, 4]))).rejects.toBeInstanceOf(PhotoError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an unknown driver", async () => {
    vi.stubEnv("STORAGE_DRIVER", "s3");
    await expect(savePhoto(PNG)).rejects.toThrow(/not supported/);
  });
});
