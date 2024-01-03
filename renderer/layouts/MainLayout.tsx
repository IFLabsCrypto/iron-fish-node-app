import {
  Grid,
  GridItem,
  Box,
  VStack,
  Text,
  HStack,
  Flex,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { createContext, ReactNode, useContext, useState } from "react";

import { BackButton } from "@/components/BackButton/BackButton";
import { LanguageSelector } from "@/components/LanguageSelector/LanguageSelector";
import { StatusIndicator } from "@/components/StatusIndicator/StatusIndicator";
import { ChakraLink } from "@/ui/ChakraLink/ChakraLink";
import { COLORS } from "@/ui/colors";
import { DarkModeSwitch } from "@/ui/DarkModeSwitch/DarkModeSwitch";
import { AddressBook } from "@/ui/SVGs/AddressBook";
import { ArrowReceive } from "@/ui/SVGs/ArrowReceive";
import { ArrowSend } from "@/ui/SVGs/ArrowSend";
import { House } from "@/ui/SVGs/House";
import { LogoLg } from "@/ui/SVGs/LogoLg";
import { LogoSm } from "@/ui/SVGs/LogoSm";
import { ReleaseNotes } from "@/ui/SVGs/ReleaseNotes";
import { YourNode } from "@/ui/SVGs/YourNode";

import { WithDraggableArea } from "./WithDraggableArea";

const LINKS = [
  {
    label: "Accounts",
    href: "/accounts",
    icon: <House />,
  },
  {
    label: "Send $IRON",
    href: "/send",
    icon: <ArrowSend />,
  },
  {
    label: "Receive $IRON",
    href: "/receive",
    icon: <ArrowReceive />,
  },
  {
    label: "Address Book",
    href: "/address-book",
    icon: <AddressBook />,
  },
  {
    label: "Your Node",
    href: "/your-node",
    icon: <YourNode />,
  },
  {
    label: "Release Notes",
    href: "/release-notes",
    icon: <ReleaseNotes />,
  },
];

function ResponsiveLogo() {
  return (
    <Box>
      <Box
        display={{
          base: "none",
          sm: "block",
        }}
      >
        <LogoLg />
      </Box>
      <Box
        display={{
          base: "block",
          sm: "none",
        }}
      >
        <LogoSm />
      </Box>
    </Box>
  );
}

function Sidebar() {
  const router = useRouter();

  return (
    <Flex flexDirection="column" alignItems="stretch" w="100%">
      <Box pl={4} mb={10}>
        <ResponsiveLogo />
      </Box>
      <VStack alignItems="flex-start" flexGrow={1}>
        {LINKS.map(({ label, href, icon }) => {
          const isActive = router.pathname.startsWith(href);
          return (
            <ChakraLink
              key={href}
              href={href}
              w="100%"
              py={3}
              px={2}
              borderRadius={4}
              bg={isActive ? COLORS.GRAY_LIGHT : "transparent"}
              _dark={{
                bg: isActive ? COLORS.DARK_MODE.GRAY_MEDIUM : "transparent",
              }}
              _hover={{
                bg: COLORS.GRAY_LIGHT,
                _dark: {
                  bg: COLORS.DARK_MODE.GRAY_MEDIUM,
                },
              }}
            >
              <HStack>
                <Box w="30px" display="flex" justifyContent="center">
                  {icon}
                </Box>
                <Text
                  display={{
                    base: "none",
                    sm: "block",
                  }}
                >
                  {label}
                </Text>
              </HStack>
            </ChakraLink>
          );
        })}
      </VStack>
      <VStack alignItems="stretch" gap={3}>
        <StatusIndicator />
        <LanguageSelector />
        <DarkModeSwitch />
      </VStack>
    </Flex>
  );
}

type Props = {
  children: ReactNode;
  backLinkProps?: {
    label: string;
    href: string;
  };
};

const ScrollElementContext = createContext<HTMLDivElement | null>(null);

export function useScrollElementContext() {
  return useContext(ScrollElementContext);
}

export default function MainLayout({ children, backLinkProps }: Props) {
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(
    null,
  );

  return (
    <WithDraggableArea
      bg="white"
      _dark={{
        bg: COLORS.DARK_MODE.BG,
      }}
    >
      <Grid height="100%" templateColumns="auto 1fr">
        <GridItem
          h="100%"
          overflow="auto"
          w={{
            base: "auto",
            sm: "265px",
          }}
          p={4}
          pt="50px"
          display="flex"
          alignItems="stretch"
        >
          <Sidebar />
        </GridItem>
        <GridItem
          px={6}
          pt={10}
          pb={8}
          h="100%"
          overflow="auto"
          ref={(r) => setScrollElement(r)}
        >
          <ScrollElementContext.Provider value={scrollElement}>
            <Box
              mx="auto"
              maxWidth={{
                base: "100%",
                sm: "597px",
                lg: "825px",
                xl: "1048px",
                "2xl": "1280px",
              }}
            >
              {backLinkProps && (
                <BackButton
                  href={backLinkProps.href}
                  label={backLinkProps.label}
                />
              )}
              {children}
            </Box>
          </ScrollElementContext.Provider>
        </GridItem>
      </Grid>
    </WithDraggableArea>
  );
}
