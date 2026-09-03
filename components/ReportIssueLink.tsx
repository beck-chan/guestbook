import { reportIssueUrl } from "@/lib/flags";

export function ReportIssueLink() {
  return (
    <a
      className="report-issue"
      href={reportIssueUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      report issue
    </a>
  );
}
