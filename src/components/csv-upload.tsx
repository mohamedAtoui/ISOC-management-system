"use client";

import { useState, useRef, useCallback } from "react";

interface PreviewMember {
  studentId: string;
  name: string;
  gender: "M" | "F" | null;
  joiningDate: string;
  membershipExpires: string;
  isEligible: boolean;
}

interface PreviewResponse {
  preview: true;
  count: number;
  members: PreviewMember[];
}

interface ImportResponse {
  imported: number;
  errors: string[];
}

type Status = "idle" | "uploading" | "previewing" | "importing" | "done" | "error";

export function CsvUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [previewData, setPreviewData] = useState<PreviewResponse | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    setFile(null);
    setStatus("idle");
    setPreviewData(null);
    setImportResult(null);
    setErrorMessage("");
  }, []);

  const handleFile = useCallback((selectedFile: File) => {
    const ext = selectedFile.name.toLowerCase().split(".").pop();
    if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
      setErrorMessage("Please select a CSV or Excel (.xlsx, .xls) file.");
      setStatus("error");
      return;
    }
    setFile(selectedFile);
    setStatus("idle");
    setPreviewData(null);
    setImportResult(null);
    setErrorMessage("");
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) handleFile(selectedFile);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFile(droppedFile);
    },
    [handleFile]
  );

  const handlePreview = useCallback(async () => {
    if (!file) return;

    setStatus("uploading");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/members/import?preview=true", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to parse file");
      }

      setPreviewData(data as PreviewResponse);
      setStatus("previewing");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrorMessage(message);
      setStatus("error");
    }
  }, [file]);

  const handleImport = useCallback(async () => {
    if (!file) return;

    setStatus("importing");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/members/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to import");
      }

      setImportResult(data as ImportResponse);
      setStatus("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setErrorMessage(message);
      setStatus("error");
    }
  }, [file]);

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50 "
            : "border-stone-300 bg-white hover:border-stone-400"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
        <div className="space-y-2">
          <svg
            className="mx-auto h-10 w-10 text-stone-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
          <p className="text-sm font-medium text-stone-700">
            {file
              ? file.name
              : "Drag and drop a CSV or Excel file here, or click to browse"}
          </p>
          <p className="text-xs text-stone-500">
            CSV or Excel (.xlsx) with columns: Name, Student ID, Joining Date, Membership Expires
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {file && status !== "done" && (
          <button
            onClick={handlePreview}
            disabled={status === "uploading" || status === "importing"}
            className="rounded-md bg-stone-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "uploading" ? "Parsing..." : "Upload & Preview"}
          </button>
        )}

        {status === "previewing" && (
          <button
            onClick={handleImport}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            Confirm Import
          </button>
        )}

        {(status === "previewing" || status === "done" || status === "error") && (
          <button
            onClick={resetState}
            className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50"
          >
            Reset
          </button>
        )}
      </div>

      {/* Error Message */}
      {status === "error" && errorMessage && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            Error
          </p>
          <p className="mt-1 text-sm text-red-600">
            {errorMessage}
          </p>
        </div>
      )}

      {/* Import Results */}
      {status === "done" && importResult && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-700">
            Import Complete
          </p>
          <p className="mt-1 text-sm text-emerald-600">
            Successfully imported {importResult.imported} member
            {importResult.imported !== 1 ? "s" : ""}.
          </p>
          {importResult.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-red-600">
                {importResult.errors.length} error
                {importResult.errors.length !== 1 ? "s" : ""}:
              </p>
              <ul className="mt-1 list-inside list-disc text-sm text-red-600">
                {importResult.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Preview Table */}
      {status === "previewing" && previewData && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-stone-900">
              Preview ({previewData.count} members)
            </h2>
            <div className="flex items-center gap-4 text-sm text-stone-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Eligible
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
                Expired
              </span>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-stone-200">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                    Student ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                    Joining Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 bg-white">
                {previewData.members.map((member, index) => (
                  <tr
                    key={member.studentId}
                    className="transition-colors hover:bg-stone-50"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-stone-500">
                      {index + 1}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-stone-900">
                      {member.studentId}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-stone-900">
                      {member.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-stone-700">
                      {member.joiningDate}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-stone-700">
                      {member.membershipExpires}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          member.isEligible
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            member.isEligible ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        {member.isEligible ? "Eligible" : "Expired"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading indicator for import */}
      {status === "importing" && (
        <div className="flex items-center gap-3 rounded-md border border-stone-200 bg-stone-50 p-4">
          <svg
            className="h-5 w-5 animate-spin text-stone-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p className="text-sm font-medium text-stone-700">
            Importing members...
          </p>
        </div>
      )}
    </div>
  );
}
