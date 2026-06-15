import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppShell, PageHeader } from "@/components/app-shell";
import { CitationCard } from "@/components/citation-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getKnowledgeDocuments,
  reindexKnowledgeSource,
  removeKnowledgeSource,
  runKnowledgeSearch,
  uploadKnowledgeSource,
} from "@/lib/api/copilot.functions";
import type { KnowledgeDocument } from "@/lib/copilot-types";
import {
  BookOpen,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

export const Route = createFileRoute("/knowledge")({
  head: () => ({ meta: [{ title: "Knowledge - Sentinel" }] }),
  component: Knowledge,
});

const SOURCE_TYPES = ["all", "policy", "faq", "ticket_history", "troubleshooting"] as const;

function Knowledge() {
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);
  const [localSearch, setLocalSearch] = useState("");
  const [sourceType, setSourceType] = useState<(typeof SOURCE_TYPES)[number]>("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadForm, setUploadForm] = useState({
    title: "",
    sourceType: "policy",
    category: "",
    accessLevel: "support",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);

  const docsQuery = useQuery({
    queryKey: ["knowledge-docs", sourceType, categoryFilter],
    queryFn: () =>
      getKnowledgeDocuments({
        data: {
          sourceType: sourceType === "all" ? undefined : sourceType,
          category: categoryFilter.trim() || undefined,
          limit: 100,
          offset: 0,
        },
      }),
    refetchInterval: 5_000,
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadFile) {
        throw new Error("Select a file before uploading.");
      }

      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadForm.title.trim());
      formData.append("source_type", uploadForm.sourceType);

      if (uploadForm.category.trim()) {
        formData.append("category", uploadForm.category.trim());
      }

      if (uploadForm.accessLevel.trim()) {
        formData.append("access_level", uploadForm.accessLevel.trim());
      }

      return uploadKnowledgeSource({ data: formData });
    },
    onSuccess: async (result) => {
      setPageMessage(`Uploaded ${result.title}. Index status: ${result.indexingStatus}.`);
      setUploadFile(null);
      setUploadForm({
        title: "",
        sourceType: "policy",
        category: "",
        accessLevel: "support",
      });
      setShowUpload(false);
      await queryClient.invalidateQueries({ queryKey: ["knowledge-docs"] });
    },
  });

  const reindexMutation = useMutation({
    mutationFn: async (docId?: string) =>
      reindexKnowledgeSource({
        data: {
          docId,
          force: true,
        },
      }),
    onSuccess: async (_, docId) => {
      setPageMessage(docId ? `Reindex requested for ${docId}.` : "Reindex requested for all documents.");
      await queryClient.invalidateQueries({ queryKey: ["knowledge-docs"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) =>
      removeKnowledgeSource({
        data: { docId },
      }),
    onSuccess: async (_, docId) => {
      setPageMessage(`Deleted ${docId}.`);
      await queryClient.invalidateQueries({ queryKey: ["knowledge-docs"] });
    },
  });

  const retrievalMutation = useMutation({
    mutationFn: async () =>
      runKnowledgeSearch({
        data: {
          query: searchQuery.trim(),
          topK: 5,
          filters: categoryFilter.trim()
            ? { category: categoryFilter.trim().toLowerCase() }
            : {},
        },
      }),
  });

  const documents = docsQuery.data?.items ?? [];
  const filteredDocuments = useMemo(() => {
    const query = localSearch.trim().toLowerCase();
    if (!query) return documents;

    return documents.filter((doc) =>
      `${doc.docId} ${doc.title} ${doc.fileName} ${doc.sourceType}`
        .toLowerCase()
        .includes(query),
    );
  }, [documents, localSearch]);

  const healthyCount = documents.filter((doc) => doc.indexingStatus === "indexed").length;
  const pendingCount = documents.filter((doc) => doc.indexingStatus !== "indexed").length;

  return (
    <AppShell>
      <PageHeader
        title="Knowledge"
        subtitle="Policies, guides, and past tickets the AI retrieves from."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => reindexMutation.mutate(undefined)}
              disabled={reindexMutation.isPending}
            >
              {reindexMutation.isPending ? (
                <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-1.5 h-4 w-4" />
              )}
              Reindex all
            </Button>
            <Button size="sm" onClick={() => setShowUpload((value) => !value)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {showUpload ? "Hide upload" : "Add source"}
            </Button>
          </>
        }
      />

      <div className="space-y-4 p-6">
        {pageMessage && (
          <div className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            {pageMessage}
          </div>
        )}
        {(docsQuery.error || uploadMutation.error || reindexMutation.error || deleteMutation.error || retrievalMutation.error) && (
          <div className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {(docsQuery.error ?? uploadMutation.error ?? reindexMutation.error ?? deleteMutation.error ?? retrievalMutation.error)?.message}
          </div>
        )}

        {showUpload && (
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Upload className="h-4 w-4 text-primary" />
                Upload knowledge source
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Title</span>
                  <Input
                    value={uploadForm.title}
                    onChange={(event) =>
                      setUploadForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Refund Policy"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Source type</span>
                  <select
                    value={uploadForm.sourceType}
                    onChange={(event) =>
                      setUploadForm((current) => ({ ...current, sourceType: event.target.value }))
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="policy">policy</option>
                    <option value="faq">faq</option>
                    <option value="ticket_history">ticket_history</option>
                    <option value="troubleshooting">troubleshooting</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Category</span>
                  <Input
                    value={uploadForm.category}
                    onChange={(event) =>
                      setUploadForm((current) => ({ ...current, category: event.target.value }))
                    }
                    placeholder="billing"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium">Access level</span>
                  <Input
                    value={uploadForm.accessLevel}
                    onChange={(event) =>
                      setUploadForm((current) => ({ ...current, accessLevel: event.target.value }))
                    }
                    placeholder="support"
                  />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="font-medium">File</span>
                  <Input
                    type="file"
                    accept=".md,.markdown,.txt,.pdf"
                    onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Supported formats: .md, .markdown, .txt, .pdf
                </p>
                <Button
                  onClick={() => uploadMutation.mutate()}
                  disabled={uploadMutation.isPending || !uploadForm.title.trim() || !uploadFile}
                >
                  {uploadMutation.isPending ? (
                    <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-1.5 h-4 w-4" />
                  )}
                  Upload source
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-80 max-w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={localSearch}
              onChange={(event) => setLocalSearch(event.target.value)}
              placeholder="Filter loaded documents"
              className="pl-9"
            />
          </div>
          <select
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value as (typeof SOURCE_TYPES)[number])}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="all">All source types</option>
            <option value="policy">policy</option>
            <option value="faq">faq</option>
            <option value="ticket_history">ticket_history</option>
            <option value="troubleshooting">troubleshooting</option>
          </select>
          <Input
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            placeholder="Category filter"
            className="w-48"
          />
          <div className="ml-auto inline-flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-2.5 py-1.5 text-xs text-success">
            <BookOpen className="h-3.5 w-3.5" />
            {docsQuery.isLoading
              ? "Loading index state"
              : `${healthyCount} indexed, ${pendingCount} pending or failed`}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-[1fr_130px_120px_220px] gap-3 border-b border-border px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <div>Title</div>
                <div>Type</div>
                <div>Status</div>
                <div>Actions</div>
              </div>
              <div className="divide-y divide-border">
                {docsQuery.isLoading && (
                  <div className="flex items-center gap-2 px-5 py-6 text-sm text-muted-foreground">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Loading knowledge documents...
                  </div>
                )}
                {!docsQuery.isLoading && filteredDocuments.length === 0 && (
                  <div className="p-10 text-center text-sm text-muted-foreground">
                    No knowledge documents found for these filters.
                  </div>
                )}
                {filteredDocuments.map((doc) => (
                  <KnowledgeRow
                    key={doc.docId}
                    doc={doc}
                    onReindex={() => reindexMutation.mutate(doc.docId)}
                    onDelete={() => {
                      if (window.confirm(`Delete ${doc.title}?`)) {
                        deleteMutation.mutate(doc.docId);
                      }
                    }}
                    busy={
                      (reindexMutation.isPending && reindexMutation.variables === doc.docId) ||
                      (deleteMutation.isPending && deleteMutation.variables === doc.docId)
                    }
                  />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <div>
                <div className="text-sm font-semibold">Retrieval sandbox</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Test what the member 2 retrieval API returns for a support question.
                </p>
              </div>
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="I was charged twice yesterday"
              />
              <Button
                onClick={() => retrievalMutation.mutate()}
                disabled={retrievalMutation.isPending || !searchQuery.trim()}
                className="w-full"
              >
                {retrievalMutation.isPending ? (
                  <LoaderCircle className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-1.5 h-4 w-4" />
                )}
                Search knowledge
              </Button>
              <div className="space-y-2">
                {(retrievalMutation.data?.results ?? []).map((result) => (
                  <CitationCard
                    key={result.id}
                    source={result}
                    relevance={result.relevance}
                  />
                ))}
                {retrievalMutation.data && retrievalMutation.data.results.length === 0 && (
                  <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No retrieval results returned for this query.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function KnowledgeRow({
  doc,
  onReindex,
  onDelete,
  busy,
}: {
  doc: KnowledgeDocument;
  onReindex: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_130px_120px_220px] items-center gap-3 px-5 py-3.5 text-sm">
      <div className="min-w-0">
        <div className="truncate font-semibold">{doc.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {doc.fileName} - {doc.chunkCount ?? 0} chunks
        </div>
        {doc.indexingError && (
          <div className="mt-1 text-xs text-danger">{doc.indexingError}</div>
        )}
      </div>
      <div className="text-xs capitalize text-muted-foreground">{doc.sourceType.replaceAll("_", " ")}</div>
      <div>
        <span
          className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${
            doc.indexingStatus === "indexed"
              ? "bg-success/15 text-success"
              : doc.indexingStatus === "failed"
                ? "bg-danger/10 text-danger"
                : "bg-warning/15 text-warning-foreground"
          }`}
        >
          {doc.indexingStatus}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onReindex} disabled={busy}>
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Reindex
        </Button>
        <Button variant="outline" size="sm" onClick={onDelete} disabled={busy}>
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>
    </div>
  );
}
