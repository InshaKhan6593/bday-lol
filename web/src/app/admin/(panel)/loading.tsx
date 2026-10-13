import classes from "@/components/admin/admin.module.css";

/**
 * What a screen looks like while the server is still drawing it. It shows the moment a menu link is
 * clicked, so the click is answered at once even though the data takes a trip to the server.
 */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className={`${classes.skeleton} ${classes.skeletonTitle}`} />
      <div className={`${classes.skeleton} ${classes.skeletonLine}`} />
      <div className={`${classes.skeleton} ${classes.skeletonCard}`} />
    </div>
  );
}
