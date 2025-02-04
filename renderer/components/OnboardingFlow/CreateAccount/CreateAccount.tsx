import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { trpcReact } from "@/providers/TRPCProvider";

import { ConfirmAccountStep } from "./ConfirmAccountStep";
import { CreateAccountStep } from "./CreateAccountStep";

type Steps = "create" | "confirm";

function useMaybeNewAccount() {
  const { data: accountsData, refetch: refetchGetAccounts } =
    trpcReact.getAccounts.useQuery();
  const { data: chainHead, isLoading: chainHeadIsLoading } =
    trpcReact.getExternalChainHead.useQuery(undefined, {
      cacheTime: 1000 * 60 * 10,
      staleTime: 1000 * 60 * 10,
    });
  const { mutate: createAccount, isIdle: isCreateIdle } =
    trpcReact.createAccount.useMutation();
  const accountName = accountsData?.[0]?.name;
  const { data: exportData } = trpcReact.exportAccount.useQuery(
    {
      name: accountName ?? "",
      format: "Mnemonic",
    },
    {
      enabled: !!accountName,
    },
  );

  useEffect(() => {
    if (!isCreateIdle || accountsData === undefined || chainHeadIsLoading)
      return;

    if (accountsData.length === 0) {
      createAccount(
        {
          name: "New Account",
          createdAt: chainHead?.sequence,
          head: chainHead,
        },
        {
          onSuccess: () => {
            refetchGetAccounts();
          },
        },
      );
    }
  }, [
    accountsData,
    createAccount,
    isCreateIdle,
    refetchGetAccounts,
    chainHeadIsLoading,
    chainHead,
  ]);

  const mnemonicPhrase = exportData?.account;

  return {
    accountName,
    mnemonicPhrase,
  };
}

export function CreateAccount() {
  const router = useRouter();
  const [step, setStep] = useState<Steps>("create");
  const [editedName, setEditedName] = useState<string | null>(null);
  const { mutate: renameAccount, isLoading: isRenameLoading } =
    trpcReact.renameAccount.useMutation();

  const { accountName, mnemonicPhrase } = useMaybeNewAccount();

  if (!accountName || typeof mnemonicPhrase !== "string") {
    return null;
  }

  const newAccountName = editedName !== null ? editedName : accountName;

  if (step === "create") {
    return (
      <CreateAccountStep
        accountName={newAccountName}
        onNameChange={(name: string) => {
          setEditedName(name);
        }}
        mnemonicPhrase={mnemonicPhrase}
        onNextStep={() => {
          setStep("confirm");
        }}
      />
    );
  }
  return (
    <ConfirmAccountStep
      accountName={accountName}
      mnemonicPhrase={mnemonicPhrase}
      isLoading={isRenameLoading}
      onBack={() => {
        setStep("create");
      }}
      onNextStep={async () => {
        if (editedName !== null) {
          await renameAccount({
            account: accountName,
            newName: editedName,
          });
        }
        router.push(`/onboarding/telemetry`);
      }}
    />
  );
}
