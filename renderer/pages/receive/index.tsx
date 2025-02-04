import {
  Heading,
  VStack,
  Tabs,
  Tab,
  TabList,
  TabPanels,
  TabPanel,
} from "@chakra-ui/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { defineMessages, useIntl } from "react-intl";
import * as z from "zod";

import { AccountAddressDisplay } from "@/components/AccountAddressDisplay/AccountAddressDisplay";
import { NoAccountsMessage } from "@/components/EmptyStateMessage/shared/NoAccountsMessage";
import { ViewLedgerAddress } from "@/components/ViewLedgerAddress/ViewLedgerAddress";
import candyIronFish from "@/images/candy-iron-fish.svg";
import octopus from "@/images/octopus.svg";
import MainLayout from "@/layouts/MainLayout";
import { WithExplanatorySidebar } from "@/layouts/WithExplanatorySidebar";
import { TRPCRouterOutputs, trpcReact } from "@/providers/TRPCProvider";
import { Select } from "@/ui/Forms/Select/Select";

const messages = defineMessages({
  accountsTab: {
    defaultMessage: "Accounts",
  },
  receiveHeading: {
    defaultMessage: "Receive",
  },
  transactionDetailsHeading: {
    defaultMessage: "Transaction Details",
  },
  transactionDetailsText: {
    defaultMessage:
      "Share your address to receive payments while keeping your account details entirely private.",
  },
  fromLabel: {
    defaultMessage: "From",
  },
  ledgerDescription: {
    defaultMessage: "View your public address on your Ledger device.",
  },
});

const dataSchema = z.object({
  account: z.string().min(1),
});

export function ReceiveAccountsContent({
  accountsData,
}: {
  accountsData: TRPCRouterOutputs["getAccounts"];
}) {
  const { formatMessage } = useIntl();
  const router = useRouter();
  const accountOptions = useMemo(() => {
    return accountsData?.map((account) => {
      return {
        label: account.name,
        value: account.name,
      };
    });
  }, [accountsData]);
  const addressLookup = useMemo(() => {
    return accountsData?.reduce(
      (acc, account) => {
        acc[account.name] = account.address;
        return acc;
      },
      {} as Record<string, string>,
    );
  }, [accountsData]);

  const defaultAccount = useMemo(() => {
    const queryMatch = accountOptions?.find(
      (option) => option.label === router.query.account,
    );

    if (accountOptions.length === 0) {
      return null;
    }

    return queryMatch ? queryMatch.value : accountOptions?.[0].value;
  }, [accountOptions, router.query.account]);

  const {
    register,
    formState: { errors },
    watch,
  } = useForm<z.infer<typeof dataSchema>>({
    resolver: zodResolver(dataSchema),
    defaultValues: {
      account: defaultAccount || "",
    },
  });

  const selectedAccount = watch("account");

  return (
    <MainLayout>
      <Heading fontSize={28} lineHeight="160%">
        {formatMessage(messages.receiveHeading)}
      </Heading>

      <Tabs isLazy>
        <TabList mt={3} mb={8}>
          <Tab>{formatMessage(messages.accountsTab)}</Tab>
          <Tab>Ledger</Tab>
        </TabList>

        <TabPanels>
          <TabPanel p={0}>
            <WithExplanatorySidebar
              heading={formatMessage(messages.transactionDetailsHeading)}
              description={formatMessage(messages.transactionDetailsText)}
              imgSrc={octopus}
            >
              {defaultAccount === null ? (
                <NoAccountsMessage />
              ) : (
                <VStack alignItems="stretch" gap={4}>
                  <Select
                    {...register("account")}
                    value={selectedAccount}
                    label={formatMessage(messages.fromLabel)}
                    options={accountOptions}
                    error={errors.account?.message}
                  />
                  <AccountAddressDisplay
                    address={addressLookup[selectedAccount]}
                  />
                </VStack>
              )}
            </WithExplanatorySidebar>
          </TabPanel>

          <TabPanel p={0}>
            <WithExplanatorySidebar
              heading="Ledger"
              description={formatMessage(messages.ledgerDescription)}
              imgSrc={candyIronFish}
            >
              <ViewLedgerAddress />
            </WithExplanatorySidebar>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </MainLayout>
  );
}

export default function ReceiveAccounts() {
  const { data: accountsData } = trpcReact.getAccounts.useQuery();

  if (!accountsData) {
    return null;
  }

  return <ReceiveAccountsContent accountsData={accountsData} />;
}
