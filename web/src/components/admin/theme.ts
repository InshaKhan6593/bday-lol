import {
  Badge,
  Button,
  Checkbox,
  Input,
  InputWrapper,
  Modal,
  Paper,
  Switch,
  Table,
  createTheme,
  type MantineColorsTuple,
} from "@mantine/core";
import classes from "./admin.module.css";

/**
 * The admin's Mantine theme. Mantine draws the components; the look comes from the site's own tokens
 * (styles/tokens.css) through the classes in admin.module.css, so the admin and the site can't drift apart.
 */

// Mantine wants ten shades per color. Buttons and checks use the last one: the site's ink.
const ink: MantineColorsTuple = [
  "#f2f2f2",
  "#e6e6e6",
  "#cccccc",
  "#b3b3b3",
  "#8c8c8c",
  "#666666",
  "#4a4a4a",
  "#333333",
  "#222222",
  "#141414",
];

export const adminTheme = createTheme({
  fontFamily: "var(--font-sans)",
  headings: { fontFamily: "var(--font-sans)", fontWeight: "800" },
  black: "#141414",
  colors: { ink },
  primaryColor: "ink",
  primaryShade: 9,
  defaultRadius: "md",
  components: {
    Input: Input.extend({ classNames: { input: classes.input } }),
    InputWrapper: InputWrapper.extend({ classNames: { label: classes.label, error: classes.error } }),
    Paper: Paper.extend({ classNames: { root: classes.card } }),
    Modal: Modal.extend({ classNames: { content: classes.modal, title: classes.modalTitle }, defaultProps: { centered: true } }),
    Button: Button.extend({ classNames: { root: classes.button }, defaultProps: { radius: "xl" } }),
    Badge: Badge.extend({ classNames: { root: classes.badge }, defaultProps: { radius: "xl", size: "md" } }),
    Table: Table.extend({ classNames: { th: classes.th, td: classes.td }, defaultProps: { verticalSpacing: "sm", horizontalSpacing: "md" } }),
    Checkbox: Checkbox.extend({ classNames: { input: classes.checkbox } }),
    Switch: Switch.extend({ classNames: { track: classes.switchTrack } }),
  },
});
