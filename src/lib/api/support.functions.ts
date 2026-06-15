import { createServerFn } from "@tanstack/react-start";

import {
  acceptChatCase,
  acceptTicketCase,
  approveChatSuggestion,
  approveTicketDraft,
  closeChatCase,
  escalateChatCase,
  escalateTicketCase,
  getChatSessionDetail,
  getSupportOverviewData,
  getSupportTicketDetail,
  listChatSessions,
  listSupportTickets,
  rejectChatSuggestion,
  rejectTicketDraft,
  saveChatSuggestion,
  saveTicketDraft,
  sendChatReply,
  sendTicketReply,
} from "../support.server";

export const getSupportOverview = createServerFn({ method: "GET" })
  .validator((input: { limit?: number } | undefined) => input)
  .handler(async () => {
    return getSupportOverviewData();
  });

export const getSupportTickets = createServerFn({ method: "GET" })
  .validator((input: { limit?: number } | undefined) => input)
  .handler(async ({ data }) => {
    return listSupportTickets(data?.limit ?? 100);
  });

export const getSupportTicket = createServerFn({ method: "GET" })
  .validator((input: { ticketId: string }) => input)
  .handler(async ({ data }) => {
    return getSupportTicketDetail(data.ticketId);
  });

export const getChatSessions = createServerFn({ method: "GET" })
  .validator((input: { limit?: number } | undefined) => input)
  .handler(async ({ data }) => {
    return listChatSessions(data?.limit ?? 100);
  });

export const getChatSession = createServerFn({ method: "GET" })
  .validator((input: { sessionId: string }) => input)
  .handler(async ({ data }) => {
    return getChatSessionDetail(data.sessionId);
  });

export const acceptTicketAction = createServerFn({ method: "POST" })
  .validator((input: { ticketId: string; trackingCode: string }) => input)
  .handler(async ({ data }) => {
    return acceptTicketCase(data);
  });

export const saveTicketDraftAction = createServerFn({ method: "POST" })
  .validator((input: { draftId: string; editedReply: string }) => input)
  .handler(async ({ data }) => {
    return saveTicketDraft(data);
  });

export const approveTicketDraftAction = createServerFn({ method: "POST" })
  .validator((input: { draftId: string; editedReply: string }) => input)
  .handler(async ({ data }) => {
    return approveTicketDraft(data);
  });

export const rejectTicketDraftAction = createServerFn({ method: "POST" })
  .validator((input: { draftId: string; note?: string | null }) => input)
  .handler(async ({ data }) => {
    return rejectTicketDraft(data);
  });

export const sendTicketReplyAction = createServerFn({ method: "POST" })
  .validator((input: { draftId: string; ticketId: string; trackingCode: string; message: string }) => input)
  .handler(async ({ data }) => {
    return sendTicketReply(data);
  });

export const escalateTicketAction = createServerFn({ method: "POST" })
  .validator((input: { draftId: string; ticketId: string; reason: string; targetTeam?: string | null }) => input)
  .handler(async ({ data }) => {
    return escalateTicketCase(data);
  });

export const saveChatSuggestionAction = createServerFn({ method: "POST" })
  .validator((input: { suggestionId: string; editedReply: string }) => input)
  .handler(async ({ data }) => {
    return saveChatSuggestion(data);
  });

export const acceptChatAction = createServerFn({ method: "POST" })
  .validator((input: { sessionId: string }) => input)
  .handler(async ({ data }) => {
    return acceptChatCase(data);
  });

export const closeChatAction = createServerFn({ method: "POST" })
  .validator((input: { sessionId: string }) => input)
  .handler(async ({ data }) => {
    return closeChatCase(data);
  });

export const approveChatSuggestionAction = createServerFn({ method: "POST" })
  .validator((input: { suggestionId: string; editedReply: string }) => input)
  .handler(async ({ data }) => {
    return approveChatSuggestion(data);
  });

export const rejectChatSuggestionAction = createServerFn({ method: "POST" })
  .validator((input: { suggestionId: string; note?: string | null }) => input)
  .handler(async ({ data }) => {
    return rejectChatSuggestion(data);
  });

export const sendChatReplyAction = createServerFn({ method: "POST" })
  .validator((input: { suggestionId: string; sessionId: string; message: string }) => input)
  .handler(async ({ data }) => {
    return sendChatReply(data);
  });

export const escalateChatAction = createServerFn({ method: "POST" })
  .validator((input: { suggestionId: string; sessionId: string; reason: string; targetTeam?: string | null }) => input)
  .handler(async ({ data }) => {
    return escalateChatCase(data);
  });
