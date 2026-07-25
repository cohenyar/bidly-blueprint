import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

export type RequestQuestionRow = Database["public"]["Tables"]["request_questions"]["Row"];
export type RequestAnswerRow = Database["public"]["Tables"]["request_question_answers"]["Row"];
export type RequestQuestionType =
  | "short_text"
  | "long_text"
  | "single_choice"
  | "multiple_choice"
  | "number";

export type RequestAnswerReview = {
  question_id: string;
  answer: Json;
  question: {
    prompt_he: string;
    field_type: string;
    sort_order: number;
  } | null;
};

export function useRequestQuestions(subcategoryId: string | null, serviceId: string | null) {
  return useQuery({
    queryKey: ["request-questions", subcategoryId, serviceId],
    enabled: Boolean(subcategoryId),
    queryFn: async (): Promise<RequestQuestionRow[]> => {
      if (!subcategoryId) return [];
      let query = supabase
        .from("request_questions")
        .select("*")
        .eq("subcategory_id", subcategoryId)
        .eq("is_active", true);
      query = serviceId
        ? query.or(`service_id.is.null,service_id.eq.${serviceId}`)
        : query.is("service_id", null);
      const { data, error } = await query.order("sort_order").order("id");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRequestQuestionAnswers(requestId: string | null) {
  return useQuery({
    queryKey: ["request-question-answers", requestId],
    enabled: Boolean(requestId),
    queryFn: async (): Promise<RequestAnswerRow[]> => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from("request_question_answers")
        .select("*")
        .eq("request_id", requestId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRequestAnswerReview(requestId: string) {
  return useQuery({
    queryKey: ["request-answer-review", requestId],
    enabled: Boolean(requestId),
    queryFn: async (): Promise<RequestAnswerReview[]> => {
      const { data, error } = await supabase
        .from("request_question_answers")
        .select("question_id,answer,question:request_questions(prompt_he,field_type,sort_order)")
        .eq("request_id", requestId);
      if (error) throw error;
      return ((data ?? []) as RequestAnswerReview[]).sort(
        (left, right) => (left.question?.sort_order ?? 0) - (right.question?.sort_order ?? 0),
      );
    },
  });
}

export function useSaveRequestQuestionAnswer(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      question,
      answer,
      exists,
    }: {
      question: RequestQuestionRow;
      answer: Json;
      exists: boolean;
    }) => {
      if (exists) {
        const { error } = await supabase
          .from("request_question_answers")
          .update({
            answer,
            definition_version: question.definition_version,
          })
          .eq("request_id", requestId)
          .eq("question_id", question.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("request_question_answers").insert({
        request_id: requestId,
        question_id: question.id,
        answer,
        definition_version: question.definition_version,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["request-question-answers", requestId],
      });
    },
  });
}

export function useDeleteRequestQuestionAnswer(requestId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase
        .from("request_question_answers")
        .delete()
        .eq("request_id", requestId)
        .eq("question_id", questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["request-question-answers", requestId],
      });
    },
  });
}

export function questionOptions(question: RequestQuestionRow): string[] {
  return Array.isArray(question.options)
    ? question.options.filter((option): option is string => typeof option === "string")
    : [];
}

export function isQuestionVisible(
  question: RequestQuestionRow,
  answers: Record<string, Json | undefined>,
) {
  if (!question.condition_question_id) return true;
  const dependency = answers[question.condition_question_id];
  if (!hasQuestionAnswer(dependency)) return false;
  const expected = question.condition_value;
  const equals = JSON.stringify(dependency) === JSON.stringify(expected);
  if (question.condition_operator === "equals") return equals;
  if (question.condition_operator === "not_equals") return !equals;
  if (question.condition_operator === "contains") {
    return (
      Array.isArray(dependency) &&
      dependency.some((value) => JSON.stringify(value) === JSON.stringify(expected))
    );
  }
  return false;
}

export function hasQuestionAnswer(value: Json | undefined) {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== undefined;
}
