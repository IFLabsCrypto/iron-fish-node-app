import Store, { Schema } from "electron-store";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { t } from "../trpc";

const contactDefinition = z.object({
  id: z.string(),
  name: z.string(),
  address: z.string(),
  note: z.string().optional(),
});

type Contact = z.infer<typeof contactDefinition>;

const schema: Schema<{
  contacts: Contact[];
}> = {
  contacts: {
    type: "array",
    items: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        address: { type: "string" },
        note: { type: "string" },
      },
      required: ["id", "name", "address"],
      additionalProperties: false,
    },
  },
};

const store = new Store({ schema });

export const contactsRouter = t.router({
  getContacts: t.procedure.query(async () => {
    return store.get("contacts", []);
  }),
  addContact: t.procedure
    .input(
      z.object({
        name: z.string(),
        address: z.string(),
      }),
    )
    .mutation(async (opts) => {
      const contacts = store.get("contacts", []);
      contacts.push({
        id: uuidv4(),
        name: opts.input.name,
        address: opts.input.address,
      });
      store.set("contacts", contacts);
      return contacts;
    }),
  deleteContact: t.procedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async (opts) => {
      const contacts = store.get("contacts", []);
      const index = contacts.findIndex(
        (contact) => contact.id === opts.input.id,
      );

      if (index > -1) {
        contacts.splice(index, 1);
        store.set("contacts", contacts);
      }

      return contacts;
    }),
});