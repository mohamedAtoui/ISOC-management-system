"use client";

import { CsvUpload } from "@/components/csv-upload";

export default function ImportPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-900">
        Import Members
      </h1>
      <p className="mt-1 text-sm text-stone-500">
        Upload a CSV file to import or update member records.
      </p>

      <div className="mt-8">
        <CsvUpload />
      </div>
    </div>
  );
}
