import { useEffect, useMemo, useRef, useState } from "react";

import type { Json } from "@/integrations/supabase/types";
import {
  hasQuestionAnswer,
  isQuestionVisible,
  questionOptions,
  useDeleteRequestQuestionAnswer,
  useRequestQuestionAnswers,
  useRequestQuestions,
  useSaveRequestQuestionAnswer,
  type RequestQuestionRow,
  type RequestQuestionType,
} from "@/lib/request-questionnaire";
import { cn } from "@/lib/utils";

const inputClass =
  "mt-1.5 block h-11 w-full rounded-lg border border-input bg-background px-3.5 text-[14px] text-foreground shadow-e1 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

export function DynamicRequestQuestionnaire({
  requestId,
  subcategoryId,
  serviceId,
  onValidityChange,
  onPendingChange,
}: {
  requestId: string;
  subcategoryId: string | null;
  serviceId: string | null;
  onValidityChange: (valid: boolean) => void;
  onPendingChange: (pending: boolean) => void;
}) {
  const questionsQuery = useRequestQuestions(subcategoryId, serviceId);
  const answersQuery = useRequestQuestionAnswers(requestId);
  const saveAnswer = useSaveRequestQuestionAnswer(requestId);
  const deleteAnswer = useDeleteRequestQuestionAnswer(requestId);
  const [values, setValues] = useState<Record<string, Json | undefined>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const loadedKeyRef = useRef("");
  const dirtyRef = useRef(new Map<string, Json | undefined>());

  const scopeKey = `${requestId}:${subcategoryId ?? ""}:${serviceId ?? ""}`;
  useEffect(() => {
    if (!answersQuery.isSuccess) return;
    const answerKey = `${scopeKey}:${answersQuery.dataUpdatedAt}`;
    if (loadedKeyRef.current === answerKey) return;
    setValues(
      Object.fromEntries(
        (answersQuery.data ?? []).map((answer) => [answer.question_id, answer.answer]),
      ),
    );
    loadedKeyRef.current = answerKey;
  }, [answersQuery.isSuccess, answersQuery.data, answersQuery.dataUpdatedAt, scopeKey]);

  const visibleQuestions = useMemo(
    () => (questionsQuery.data ?? []).filter((question) => isQuestionVisible(question, values)),
    [questionsQuery.data, values],
  );

  const valid =
    !questionsQuery.isPending &&
    visibleQuestions.every(
      (question) => !question.is_required || hasQuestionAnswer(values[question.id]),
    );

  useEffect(() => onValidityChange(valid), [onValidityChange, valid]);

  const pending = dirtyRef.current.size > 0 || saveAnswer.isPending || deleteAnswer.isPending;
  useEffect(() => onPendingChange(pending), [onPendingChange, pending]);

  useEffect(() => {
    if (dirtyRef.current.size === 0) return;
    const timer = window.setTimeout(() => {
      const entries = [...dirtyRef.current.entries()];
      dirtyRef.current.clear();
      void (async () => {
        try {
          setSaveError(null);
          for (const [questionId, value] of entries) {
            const question = questionsQuery.data?.find((candidate) => candidate.id === questionId);
            if (!question) continue;
            const exists = (answersQuery.data ?? []).some(
              (answer) => answer.question_id === questionId,
            );
            if (!hasQuestionAnswer(value)) {
              if (exists) await deleteAnswer.mutateAsync(questionId);
            } else {
              await saveAnswer.mutateAsync({
                question,
                answer: value as Json,
                exists,
              });
            }
          }
        } catch {
          setSaveError("שמירת התשובות נכשלה. נסו שוב לפני הפרסום.");
        }
      })();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [values, questionsQuery.data, answersQuery.data, deleteAnswer, saveAnswer]);

  function change(questionId: string, value: Json | undefined) {
    setValues((current) => ({ ...current, [questionId]: value }));
    dirtyRef.current.set(questionId, value);
  }

  if (!subcategoryId || questionsQuery.isPending || answersQuery.isPending) {
    return subcategoryId ? (
      <p className="text-[13px] text-muted-foreground">טוען שאלות מותאמות…</p>
    ) : null;
  }
  if (questionsQuery.isError || answersQuery.isError) {
    return (
      <p role="alert" className="rounded-lg bg-danger/10 p-3 text-[13px] text-danger">
        לא ניתן לטעון את השאלון כרגע.
      </p>
    );
  }
  if (visibleQuestions.length === 0) return null;

  return (
    <fieldset className="space-y-5 rounded-xl border border-border bg-surface-muted/30 p-5">
      <legend className="px-2 text-[14px] font-bold text-foreground">שאלות להשלמת הבקשה</legend>
      {visibleQuestions.map((question) => (
        <QuestionField
          key={question.id}
          question={question}
          value={values[question.id]}
          onChange={(value) => change(question.id, value)}
        />
      ))}
      <p aria-live="polite" className="text-[12px] text-muted-foreground">
        {pending ? "שומר תשובות…" : "התשובות נשמרות אוטומטית בטיוטה."}
      </p>
      {saveError ? (
        <p role="alert" className="text-[12px] text-danger">
          {saveError}
        </p>
      ) : null}
    </fieldset>
  );
}

function QuestionField({
  question,
  value,
  onChange,
}: {
  question: RequestQuestionRow;
  value: Json | undefined;
  onChange: (value: Json | undefined) => void;
}) {
  const type = question.field_type as RequestQuestionType;
  const id = `request-question-${question.id}`;
  const options = questionOptions(question);

  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-semibold text-foreground">
        {question.prompt_he}
        {question.is_required ? <span className="ms-1 text-danger">*</span> : null}
      </label>
      {question.help_text_he ? (
        <p id={`${id}-help`} className="mt-1 text-[12px] text-muted-foreground">
          {question.help_text_he}
        </p>
      ) : null}

      {type === "short_text" || type === "number" ? (
        <input
          id={id}
          type={type === "number" ? "number" : "text"}
          value={typeof value === "string" || typeof value === "number" ? value : ""}
          maxLength={type === "short_text" ? 500 : undefined}
          aria-describedby={question.help_text_he ? `${id}-help` : undefined}
          className={inputClass}
          onChange={(event) =>
            onChange(
              type === "number"
                ? event.target.value
                  ? Number(event.target.value)
                  : undefined
                : event.target.value,
            )
          }
          dir={type === "short_text" ? "auto" : undefined}
        />
      ) : null}

      {type === "long_text" ? (
        <textarea
          id={id}
          value={typeof value === "string" ? value : ""}
          maxLength={4000}
          aria-describedby={question.help_text_he ? `${id}-help` : undefined}
          className={cn(inputClass, "h-28 py-3")}
          onChange={(event) => onChange(event.target.value)}
          dir="auto"
        />
      ) : null}

      {type === "single_choice" ? (
        <select
          id={id}
          value={typeof value === "string" ? value : ""}
          aria-describedby={question.help_text_he ? `${id}-help` : undefined}
          className={inputClass}
          onChange={(event) => onChange(event.target.value || undefined)}
        >
          <option value="">בחירה</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : null}

      {type === "multiple_choice" ? (
        <div id={id} className="mt-2 grid gap-2 sm:grid-cols-2">
          {options.map((option) => {
            const selected = Array.isArray(value) && value.includes(option);
            return (
              <label
                key={option}
                className="flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 text-[13px]"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    const current = Array.isArray(value)
                      ? value.filter((item): item is string => typeof item === "string")
                      : [];
                    onChange(
                      selected ? current.filter((item) => item !== option) : [...current, option],
                    );
                  }}
                />
                {option}
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
