"use client";

import { useFormContext } from "react-hook-form";
import { Calendar, Video, Tag, X, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { FileUpload } from "@/components/shared/FileUpload";
import type { CampaignWizardData } from "@/types/campaign";
import { useState, useCallback } from "react";

export function StepDescription() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<CampaignWizardData>();

  const teaser = watch("teaser");
  const tags = watch("tags");
  const attachments = watch("attachments");
  const hasSupportSection = watch("hasSupportSection");
  const description = watch("description");

  const [tagInput, setTagInput] = useState("");

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setValue("tags", [...tags, trimmed]);
      setTagInput("");
    }
  }, [tagInput, tags, setValue]);

  const removeTag = useCallback(
    (tag: string) => {
      setValue(
        "tags",
        tags.filter((t) => t !== tag),
      );
    },
    [tags, setValue],
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Campaign Title <span className="text-danger-500">*</span>
        </label>
        <input
          id="title"
          type="text"
          {...register("title", { required: "Title is required" })}
          className={cn(
            "w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent",
            errors.title ? "border-danger-500" : "border-gray-300",
          )}
          placeholder="Enter campaign title"
        />
        {errors.title && (
          <p className="mt-1 text-xs text-danger-500">{errors.title.message}</p>
        )}
      </div>

      {/* Banner Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Banner Image
        </label>
        <FileUpload
          files={
            watch("bannerUrl")
              ? [
                  {
                    id: "banner",
                    fileName: "banner",
                    fileUrl: watch("bannerUrl"),
                    fileSize: 0,
                    mimeType: "image/*",
                  },
                ]
              : []
          }
          onChange={(files) => {
            setValue("bannerUrl", files[0]?.fileUrl ?? "");
          }}
          accept="image/*"
          multiple={false}
          label="Upload banner image (recommended 1200x400)"
        />
      </div>

      {/* Timeline */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="submissionCloseDate"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1"
          >
            <Calendar size={14} />
            Submission Close Date
          </label>
          <input
            id="submissionCloseDate"
            type="date"
            {...register("submissionCloseDate")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label
            htmlFor="votingCloseDate"
            className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1"
          >
            <Calendar size={14} />
            Voting Close Date
          </label>
          <input
            id="votingCloseDate"
            type="date"
            {...register("votingCloseDate")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Teaser */}
      <div>
        <label
          htmlFor="teaser"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Teaser
        </label>
        <textarea
          id="teaser"
          {...register("teaser", { maxLength: 160 })}
          maxLength={160}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          placeholder="Brief teaser text (max 160 characters)"
        />
        <p className="mt-1 text-xs text-gray-400 text-right">
          {teaser?.length ?? 0}/160
        </p>
      </div>

      {/* Description (Rich Text) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <RichTextEditor
          content={description}
          onChange={(html) => setValue("description", html)}
          placeholder="Describe your campaign in detail..."
        />
      </div>

      {/* Video URL */}
      <div>
        <label
          htmlFor="videoUrl"
          className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1"
        >
          <Video size={14} />
          Video URL
        </label>
        <input
          id="videoUrl"
          type="url"
          {...register("videoUrl")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="https://youtube.com/watch?v=... or https://vimeo.com/..."
        />
      </div>

      {/* Attachments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Attachments
        </label>
        <FileUpload
          files={attachments}
          onChange={(files) => setValue("attachments", files)}
          label="Upload supporting documents"
        />
      </div>

      {/* Tags */}
      <div>
        <label
          htmlFor="tagInput"
          className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1"
        >
          <Tag size={14} />
          Tags
        </label>
        <div className="flex gap-2">
          <input
            id="tagInput"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Type a tag and press Enter"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-3 py-2 text-sm font-medium text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 transition-colors"
          >
            Add
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="hover:text-primary-900"
                  aria-label={`Remove tag ${tag}`}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Call to Action */}
      <div>
        <label
          htmlFor="callToActionText"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Call to Action Text
        </label>
        <input
          id="callToActionText"
          type="text"
          {...register("callToActionText")}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="Submit your idea"
        />
      </div>

      {/* Support Section */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            {...register("hasSupportSection")}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
            <HelpCircle size={14} />
            Enable Support Section
          </span>
        </label>

        {hasSupportSection && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="supportContactName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contact Name
              </label>
              <input
                id="supportContactName"
                type="text"
                {...register("supportContactName")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Support contact name"
              />
            </div>
            <div>
              <label
                htmlFor="supportContactEmail"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contact Email
              </label>
              <input
                id="supportContactEmail"
                type="email"
                {...register("supportContactEmail")}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="support@example.com"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
