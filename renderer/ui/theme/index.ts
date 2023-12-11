import { defineStyleConfig, extendTheme } from "@chakra-ui/react";

import { breakpoints, createBreakpointArray } from "./breakpoints";
import { modalTheme } from "./styleConfigs/modal";
import { COLORS } from "../colors";

const theme = extendTheme({
  config: {
    initialColorMode: "system",
    useSystemColorMode: true,
  },
  colors: {
    muted: {
      500: "black",
      _dark: {
        500: "white",
      },
    },
  },
  breakpoints,
  fonts: {
    heading: "extended-regular, sans-serif",
    body: "favorit-regular, sans-serif",
  },
  components: {
    Heading: defineStyleConfig({
      baseStyle: {
        fontWeight: "regular",
      },
    }),
    Text: defineStyleConfig({
      baseStyle: {
        color: COLORS.BLACK,
        fontSize: "sm",
        _dark: {
          color: COLORS.WHITE,
        },
      },
    }),
    Tabs: defineStyleConfig({
      defaultProps: {
        colorScheme: "muted",
        size: "sm",
      },
    }),
    Modal: modalTheme,
  },
});

export { createBreakpointArray };

export default theme;
