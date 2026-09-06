"use client";

import {
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  useLanguage,
} from "@/components/language-provider";

import {
  Button,
} from "@/components/ui/button";

/* =========================================================
   CONFIG
========================================================= */

const STORAGE_KEY =
  "leadbase:ai-lead-search-chat:v1";

/* =========================================================
   TYPES
========================================================= */

type Campaign = {
  id: string;

  name: string;

  target_industry:
    | string
    | null;

  target_geography:
    | string
    | null;

  status: string;
};

type ChatMessage = {
  id: string;

  role:
    | "user"
    | "assistant";

  content: string;

  createdAt: string;
};

type SearchContext = {
  industries: string[];

  location: string;

  resultLimit: number;
};

type StoredChat = {
  messages:
    ChatMessage[];

  context:
    | SearchContext
    | null;
};

type AiSearchResponse = {
  ok?: boolean;

  error?: string;

  needsClarification?: boolean;

  assistantMessage?: string;

  searchId?: string;

  foundCount?: number;

  skippedKnown?: number;

  intent?:
    SearchContext;
};

/* =========================================================
   COPY
========================================================= */

const copy = {
  de: {
    title:
      "Was möchtest du finden?",

    placeholder:
      "Finde mir 30 Firmen aus Albstadt aus Handwerk und Gartenbau...",

    campaign:
      "Kampagne",

    searching:
      "Ich suche nach passenden Firmen...",

    newChat:
      "Neuer Chat",

    selectCampaign:
      "Bitte wähle zuerst eine Kampagne aus.",

    genericError:
      "Die Suche ist gerade fehlgeschlagen. Versuch es bitte erneut.",

    exampleOne:
      "30 Handwerker in Albstadt",

    exampleTwo:
      "20 Gartenbauer in Balingen",

    exampleThree:
      "15 Elektriker in Hechingen",

    examples:
      "Zum Beispiel",
  },

  en: {
    title:
      "What would you like to find?",

    placeholder:
      "Find me 30 trades and landscaping companies in Albstadt...",

    campaign:
      "Campaign",

    searching:
      "I'm searching for matching companies...",

    newChat:
      "New chat",

    selectCampaign:
      "Please select a campaign first.",

    genericError:
      "The search failed. Please try again.",

    exampleOne:
      "30 trades companies in Albstadt",

    exampleTwo:
      "20 landscapers in Balingen",

    exampleThree:
      "15 electricians in Hechingen",

    examples:
      "For example",
  },
} as const;

/* =========================================================
   ID
========================================================= */

function createMessageId() {
  return `${Date.now()}-${Math.random()
    .toString(
      36
    )
    .slice(
      2
    )}`;
}

/* =========================================================
   STORED CHAT
========================================================= */

function readStoredChat():
  StoredChat | null {
  try {
    const raw =
      window.localStorage.getItem(
        STORAGE_KEY
      );

    if (
      !raw
    ) {
      return null;
    }

    const parsed =
      JSON.parse(
        raw
      ) as Partial<StoredChat>;

    const messages =
      Array.isArray(
        parsed.messages
      )
        ? parsed.messages.filter(
            (
              message
            ): message is ChatMessage => {
              if (
                typeof message !==
                  "object" ||
                message ===
                  null
              ) {
                return false;
              }

              return (
                (
                  message.role ===
                    "user" ||
                  message.role ===
                    "assistant"
                ) &&
                typeof message.content ===
                  "string" &&
                typeof message.id ===
                  "string" &&
                typeof message.createdAt ===
                  "string"
              );
            }
          )
        : [];

    let context:
      SearchContext | null =
      null;

    if (
      typeof parsed.context ===
        "object" &&
      parsed.context !==
        null &&
      !Array.isArray(
        parsed.context
      )
    ) {
      const value =
        parsed.context as Partial<SearchContext>;

      if (
        Array.isArray(
          value.industries
        ) &&
        value.industries.every(
          (
            item
          ) =>
            typeof item ===
            "string"
        ) &&
        typeof value.location ===
          "string" &&
        typeof value.resultLimit ===
          "number"
      ) {
        context = {
          industries:
            value.industries,

          location:
            value.location,

          resultLimit:
            value.resultLimit,
        };
      }
    }

    return {
      messages,
      context,
    };
  } catch (
    error
  ) {
    console.warn(
      "Could not read AI lead search chat:",
      error
    );

    return null;
  }
}

function writeStoredChat(
  state:
    StoredChat
) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(
        state
      )
    );
  } catch (
    error
  ) {
    console.warn(
      "Could not save AI lead search chat:",
      error
    );
  }
}

/* =========================================================
   COMPONENT
========================================================= */

export function AiLeadSearchChat({
  campaigns,
}: {
  campaigns:
    Campaign[];
}) {
  const router =
    useRouter();

  const {
    language,
  } =
    useLanguage();

  const text =
    copy[
      language
    ];

  const messagesEndRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const activeCampaigns =
    useMemo(
      () =>
        campaigns.filter(
          (
            campaign
          ) =>
            campaign.status !==
            "ARCHIVED"
        ),
      [
        campaigns,
      ]
    );

  const firstCampaign =
    activeCampaigns.find(
      (
        campaign
      ) =>
        campaign.status ===
        "ACTIVE"
    ) ??
    activeCampaigns[0] ??
    null;

  const [
    campaignId,
    setCampaignId,
  ] =
    useState(
      firstCampaign?.id ??
        ""
    );

  const [
    prompt,
    setPrompt,
  ] =
    useState(
      ""
    );

  const [
    messages,
    setMessages,
  ] =
    useState<
      ChatMessage[]
    >(
      []
    );

  const [
    context,
    setContext,
  ] =
    useState<
      SearchContext | null
    >(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      false
    );

  const [
    hydrated,
    setHydrated,
  ] =
    useState(
      false
    );

  const hasConversation =
    messages.length >
    0;

  /* =======================================================
     LOAD CHAT
  ======================================================= */

  useEffect(
    () => {
      const stored =
        readStoredChat();

      if (
        stored
      ) {
        setMessages(
          stored.messages
        );

        setContext(
          stored.context
        );
      }

      setHydrated(
        true
      );
    },
    []
  );

  /* =======================================================
     AUTO SAVE
  ======================================================= */

  useEffect(
    () => {
      if (
        !hydrated
      ) {
        return;
      }

      writeStoredChat({
        messages,
        context,
      });
    },
    [
      context,
      hydrated,
      messages,
    ]
  );

  /* =======================================================
     AUTO SCROLL
  ======================================================= */

  useEffect(
    () => {
      if (
        !hasConversation &&
        !loading
      ) {
        return;
      }

      messagesEndRef.current?.scrollIntoView({
        behavior:
          "smooth",

        block:
          "nearest",
      });
    },
    [
      hasConversation,
      loading,
      messages,
    ]
  );

  /* =======================================================
     NEW CHAT
  ======================================================= */

  function clearChat() {
    if (
      loading
    ) {
      return;
    }

    setMessages(
      []
    );

    setContext(
      null
    );

    setPrompt(
      ""
    );

    window.localStorage.removeItem(
      STORAGE_KEY
    );
  }

  /* =======================================================
     EXAMPLE
  ======================================================= */

  function useExample(
    value: string
  ) {
    if (
      loading
    ) {
      return;
    }

    setPrompt(
      value
    );
  }

  /* =======================================================
     SEND
  ======================================================= */

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanPrompt =
      prompt.trim();

    if (
      loading ||
      !cleanPrompt
    ) {
      return;
    }

    if (
      !campaignId
    ) {
      const assistantMessage:
        ChatMessage = {
        id:
          createMessageId(),

        role:
          "assistant",

        content:
          text.selectCampaign,

        createdAt:
          new Date()
            .toISOString(),
      };

      setMessages(
        (
          current
        ) => [
          ...current,
          assistantMessage,
        ]
      );

      return;
    }

    const userMessage:
      ChatMessage = {
      id:
        createMessageId(),

      role:
        "user",

      content:
        cleanPrompt,

      createdAt:
        new Date()
          .toISOString(),
    };

    const messagesWithUser =
      [
        ...messages,
        userMessage,
      ];

    setMessages(
      messagesWithUser
    );

    setPrompt(
      ""
    );

    setLoading(
      true
    );

    try {
      const response =
        await fetch(
          "/api/find-leads/ai-search",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                prompt:
                  cleanPrompt,

                campaignId,

                language,

                context,
              }),
          }
        );

      const contentType =
        response.headers.get(
          "content-type"
        ) ??
        "";

      if (
        !contentType.includes(
          "application/json"
        )
      ) {
        throw new Error(
          `AI lead search returned ${response.status}.`
        );
      }

      const result =
        (await response.json()) as
          AiSearchResponse;

      if (
        !response.ok ||
        !result.ok
      ) {
        throw new Error(
          result.error ??
            text.genericError
        );
      }

      const assistantMessage:
        ChatMessage = {
        id:
          createMessageId(),

        role:
          "assistant",

        content:
          result.assistantMessage ??
          text.genericError,

        createdAt:
          new Date()
            .toISOString(),
      };

      const nextMessages =
        [
          ...messagesWithUser,
          assistantMessage,
        ];

      setMessages(
        nextMessages
      );

      if (
        result.needsClarification
      ) {
        writeStoredChat({
          messages:
            nextMessages,

          context,
        });

        return;
      }

      const nextContext =
        result.intent ??
        context;

      setContext(
        nextContext
      );

      writeStoredChat({
        messages:
          nextMessages,

        context:
          nextContext,
      });

      if (
        result.searchId
      ) {
        router.push(
          `/find-leads?search=${encodeURIComponent(
            result.searchId
          )}`
        );
      }
    } catch (
      error
    ) {
      console.error(
        "AI lead search failed:",
        error
      );

      const assistantMessage:
        ChatMessage = {
        id:
          createMessageId(),

        role:
          "assistant",

        content:
          error instanceof
            Error
            ? error.message
            : text.genericError,

        createdAt:
          new Date()
            .toISOString(),
      };

      const nextMessages =
        [
          ...messagesWithUser,
          assistantMessage,
        ];

      setMessages(
        nextMessages
      );

      writeStoredChat({
        messages:
          nextMessages,

        context,
      });
    } finally {
      setLoading(
        false
      );
    }
  }

  /* =======================================================
     KEYBOARD
  ======================================================= */

  function handleKeyDown(
    event:
      KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key ===
        "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      event.currentTarget
        .form
        ?.requestSubmit();
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <section className="leadbase-subtle-panel mt-7 rounded-3xl border p-5 md:mt-10 md:p-7">
      <div className="mx-auto w-full max-w-4xl">
        {/* =================================================
            TITLE
        ================================================= */}

        <div className="relative">
          <div className="text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/8 text-primary">
              <Sparkles className="size-4" />
            </div>

            <h2 className="mt-4 text-xl font-medium tracking-tight sm:text-2xl">
              {
                text.title
              }
            </h2>
          </div>

          {hasConversation ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={
                loading
              }
              onClick={
                clearChat
              }
              className="absolute right-0 top-0 hidden h-8 gap-1.5 text-xs text-muted-foreground sm:inline-flex"
            >
              <RotateCcw className="size-3.5" />

              {
                text.newChat
              }
            </Button>
          ) : null}
        </div>

        {/* =================================================
            CONVERSATION
        ================================================= */}

        {hasConversation ||
        loading ? (
          <div className="mx-auto mt-7 max-h-[340px] max-w-3xl overflow-y-auto px-1">
            <div className="space-y-5">
              {messages.map(
                (
                  message
                ) =>
                  message.role ===
                  "user" ? (
                    <div
                      key={
                        message.id
                      }
                      className="flex justify-end"
                    >
                      <div className="max-w-[88%] rounded-2xl rounded-br-md bg-muted px-4 py-2.5 text-sm leading-6 sm:max-w-[75%]">
                        <p className="whitespace-pre-wrap break-words">
                          {
                            message.content
                          }
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={
                        message.id
                      }
                      className="flex items-start gap-3"
                    >
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-background">
                        <Sparkles className="size-3.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap break-words text-sm leading-6">
                          {
                            message.content
                          }
                        </p>
                      </div>
                    </div>
                  )
              )}

              {loading ? (
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border bg-background">
                    <Loader2 className="size-3.5 animate-spin" />
                  </div>

                  <p className="pt-1 text-sm leading-6 text-muted-foreground">
                    {
                      text.searching
                    }
                  </p>
                </div>
              ) : null}

              <div
                ref={
                  messagesEndRef
                }
              />
            </div>
          </div>
        ) : null}

        {/* =================================================
            COMPOSER
        ================================================= */}

        <form
          onSubmit={
            handleSubmit
          }
          className={`mx-auto max-w-3xl ${
            hasConversation ||
            loading
              ? "mt-6"
              : "mt-8"
          }`}
        >
          <div className="rounded-[24px] border border-primary/10 bg-card/90 p-2 shadow-[0_12px_36px_rgba(15,23,42,0.05)] transition-all focus-within:border-primary/25 focus-within:shadow-[0_18px_48px_rgba(15,23,42,0.08)] dark:bg-card/80">
            <textarea
              value={
                prompt
              }
              disabled={
                loading
              }
              onChange={(
                event
              ) =>
                setPrompt(
                  event.target
                    .value
                )
              }
              onKeyDown={
                handleKeyDown
              }
              rows={
                2
              }
              placeholder={
                text.placeholder
              }
              className="min-h-[64px] w-full resize-none bg-transparent px-3 pb-2 pt-3 text-sm leading-6 outline-none placeholder:text-muted-foreground sm:text-[15px]"
            />

            {/* ===============================================
                BOTTOM TOOLBAR
            =============================================== */}

            <div className="flex min-w-0 items-center gap-2 px-1 pb-1">
              <div className="min-w-0 flex-1">
                <select
                  value={
                    campaignId
                  }
                  disabled={
                    loading
                  }
                  aria-label={
                    text.campaign
                  }
                  onChange={(
                    event
                  ) =>
                    setCampaignId(
                      event.target
                        .value
                    )
                  }
                  className="h-8 max-w-[220px] truncate rounded-full border bg-background px-3 text-xs text-muted-foreground outline-none transition-colors hover:bg-muted/40 focus:ring-1 focus:ring-ring sm:max-w-[280px]"
                >
                  {activeCampaigns.map(
                    (
                      campaign
                    ) => (
                      <option
                        key={
                          campaign.id
                        }
                        value={
                          campaign.id
                        }
                      >
                        {
                          campaign.name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              <button
                type="submit"
                disabled={
                  loading ||
                  !prompt.trim() ||
                  !campaignId
                }
                aria-label="Send"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </button>
            </div>
          </div>
        </form>

        {/* =================================================
            EXAMPLES
        ================================================= */}

        {!hasConversation &&
        !loading ? (
          <div className="mx-auto mt-4 max-w-3xl">
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <span className="text-[11px] text-muted-foreground">
                {
                  text.examples
                }
              </span>

              <div className="flex max-w-full flex-wrap justify-center gap-2">
                {[
                  text.exampleOne,
                  text.exampleTwo,
                  text.exampleThree,
                ].map(
                  (
                    example
                  ) => (
                    <button
                      key={
                        example
                      }
                      type="button"
                      onClick={() =>
                        useExample(
                          example
                        )
                      }
                      className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      {
                        example
                      }
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* =================================================
            MOBILE NEW CHAT
        ================================================= */}

        {hasConversation ? (
          <div className="mt-3 flex justify-center sm:hidden">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={
                loading
              }
              onClick={
                clearChat
              }
              className="h-8 gap-1.5 text-xs text-muted-foreground"
            >
              <RotateCcw className="size-3.5" />

              {
                text.newChat
              }
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}