"use client";

import { useChat } from "@ai-sdk/react";
import { WorkflowChatTransport } from "@ai-sdk/workflow/client";
import { useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion";

const SUGGESTIONS = [
  "Show me low-stock items",
  "What were yesterday's top sellers?",
  "Summarize this week's revenue",
];

export function AdminAgentChat() {
  const [input, setInput] = useState("");

  const { messages, error, sendMessage, status, stop } = useChat({
    transport: new WorkflowChatTransport({ api: "/api/admin/chat" }),
  });

  const handleSubmit = (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (!text) return;

    sendMessage({ text });
    setInput("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage({ text: suggestion });
    setInput("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.map((message) =>
            message.parts.map((part, index) => {
              if (part.type === "tool-bash") {
                const input = part.input as { command?: string } | undefined;
                const output = part.output as
                  | { stdout?: string; stderr?: string; exitCode?: number }
                  | undefined;
                const outputAvailable = part.state === "output-available";

                return (
                  <div
                    key={`${message.id}-${index}`}
                    className="my-2 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 font-mono text-sm"
                  >
                    <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-800/50 px-3 py-2 text-neutral-400">
                      <svg
                        className="size-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z"
                        />
                      </svg>
                      <span className="text-xs">
                        {outputAvailable ? "Terminal" : "Running…"}
                      </span>
                    </div>
                    <div className="px-3 py-2">
                      <div className="break-all font-semibold text-neutral-100">
                        $ {input?.command ?? ""}
                      </div>
                      {outputAvailable && output ? (
                        <div className="mt-1 text-neutral-300">
                          {output.stdout ? (
                            <pre className="whitespace-pre-wrap">
                              {output.stdout}
                            </pre>
                          ) : null}
                          {output.stderr ? (
                            <pre className="whitespace-pre-wrap text-red-400">
                              {output.stderr}
                            </pre>
                          ) : null}
                          {typeof output.exitCode === "number" &&
                          output.exitCode !== 0 ? (
                            <div className="mt-1 text-red-400">
                              Process exited with code {output.exitCode}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center gap-1 text-neutral-500">
                          <span className="animate-pulse">▊</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              if (part.type !== "text") return null;

              return (
                <Message key={`${message.id}-${index}`} from={message.role}>
                  <MessageContent>
                    <MessageResponse>{part.text}</MessageResponse>
                  </MessageContent>
                </Message>
              );
            }),
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="flex flex-col gap-3 border-t p-3">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error.message}
          </p>
        ) : null}
        <Suggestions>
          {SUGGESTIONS.map((suggestion) => (
            <Suggestion
              key={suggestion}
              suggestion={suggestion}
              onClick={handleSuggestionClick}
            />
          ))}
        </Suggestions>
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(event) => setInput(event.currentTarget.value)}
              placeholder="Ask the admin agent…"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit
              status={status}
              onStop={stop}
              disabled={
                !input.trim() &&
                status !== "submitted" &&
                status !== "streaming"
              }
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
