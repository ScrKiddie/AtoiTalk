import { ReportAssociatedEntity } from "@/components/admin/report-associated-entity";
import AttachmentCard from "@/components/attachment-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useReportMedia } from "@/hooks/admin/use-report-media";
import { ReportDetailResponse, ReportListResponse } from "@/services/admin.service";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface ReportDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportDetail: ReportDetailResponse | undefined;
  isLoading: boolean;
  onUserAction: (userId: string, action: "view" | "ban" | "reset" | "unban") => void;
  onResolve: (report: ReportListResponse | ReportDetailResponse) => void;
  onReject: (report: ReportListResponse | ReportDetailResponse) => void;
  onImageClick: (index: number) => void;
  isLightboxOpen: boolean;
}

export function ReportDetailDialog({
  open,
  onOpenChange,
  reportDetail,
  isLoading,
  onUserAction,
  onResolve,
  onReject,
  onImageClick,
  isLightboxOpen,
}: ReportDetailDialogProps) {
  const { images, files, handleDownload, handleAttachmentRefresh } = useReportMedia(
    reportDetail,
    reportDetail?.id || null
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 gap-0"
        onInteractOutside={(e) => {
          if (isLightboxOpen) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (isLightboxOpen) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="p-6 border-b">
          <DialogTitle>Report Details</DialogTitle>
          <DialogDescription>
            Review the report information, target entity, and evidence.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : reportDetail ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wide">
                    Status
                  </span>
                  <Badge
                    variant={
                      reportDetail.status === "pending"
                        ? "outline"
                        : reportDetail.status === "resolved"
                          ? "default"
                          : "destructive"
                    }
                    className="mt-1"
                  >
                    {reportDetail.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wide">
                    Date
                  </span>
                  <span className="font-medium mt-1 block">
                    {format(new Date(reportDetail.created_at), "PPP p")}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground block text-xs uppercase tracking-wide">
                    Reason
                  </span>
                  <span className="font-medium mt-1 block">{reportDetail.reason}</span>
                  {reportDetail.description && (
                    <p className="text-muted-foreground text-xs mt-1">
                      "{reportDetail.description}"
                    </p>
                  )}
                </div>
              </div>

              <ReportAssociatedEntity
                id={reportDetail.reporter_id}
                type="user"
                isDeleted={reportDetail.reporter_is_deleted}
                isBanned={reportDetail.reporter_is_banned}
                label="Reporter"
                onUserAction={onUserAction}
              />

              <div className="space-y-6">
                <h3 className="font-semibold text-base">Reported Content</h3>

                {reportDetail.target_type === "message" && (
                  <>
                    <ReportAssociatedEntity
                      id={reportDetail.evidence_snapshot?.sender_id || ""}
                      type="user"
                      isDeleted={false}
                      isBanned={reportDetail.target_is_banned}
                      label="Message Sender"
                      onUserAction={onUserAction}
                    />

                    <div className="bg-muted p-3 rounded-md border flex flex-col gap-3">
                      <p className="text-xs text-muted-foreground uppercase">Message Content</p>

                      {reportDetail.evidence_snapshot?.content && (
                        <p className="text-sm whitespace-pre-wrap">
                          {reportDetail.evidence_snapshot.content}
                        </p>
                      )}

                      {files.length > 0 && (
                        <div className="flex flex-col gap-2">
                          {files.map((att) => (
                            <AttachmentCard
                              key={att.id}
                              file={att}
                              isSender={false}
                              onClick={() => handleDownload(att)}
                              onRefresh={async (id) => {
                                await handleAttachmentRefresh(id);
                              }}
                            />
                          ))}
                        </div>
                      )}

                      {images.length > 0 && (
                        <div
                          className={`grid gap-1 overflow-hidden rounded-md max-w-full w-full ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}
                        >
                          {images.map((item, index) => {
                            const isSingle = images.length === 1;
                            const isThree = images.length === 3;
                            const isHero = isThree && index === 0;
                            const isMultiOdd = images.length > 1 && images.length % 2 !== 0;
                            const isFooter = !isThree && isMultiOdd && index === images.length - 1;

                            const spanClass =
                              isHero || isFooter
                                ? "col-span-2 aspect-[2/1]"
                                : "col-span-1 aspect-square";
                            const singleClass = "col-span-1 aspect-square";

                            return (
                              <div
                                key={item.id}
                                className={`relative overflow-hidden rounded-md bg-muted ${isSingle ? singleClass : spanClass}`}
                              >
                                <AttachmentCard
                                  file={item}
                                  isSender={false}
                                  onClick={() => {}}
                                  onImageClick={() => onImageClick(index)}
                                  onRefresh={async (id) => {
                                    await handleAttachmentRefresh(id);
                                  }}
                                />
                                <div className="absolute inset-0 rounded-md ring-1 ring-inset pointer-events-none ring-primary/20" />
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!reportDetail.evidence_snapshot?.content &&
                        images.length === 0 &&
                        files.length === 0 && (
                          <p className="text-sm italic text-muted-foreground">[No Content]</p>
                        )}
                    </div>

                    {reportDetail.evidence_snapshot?.chat_type === "group" && (
                      <ReportAssociatedEntity
                        id={reportDetail.evidence_snapshot?.group_id || ""}
                        type="group"
                        isDeleted={false}
                        label="Context: Group Chat"
                        onUserAction={onUserAction}
                      />
                    )}
                  </>
                )}

                {reportDetail.target_type === "user" && (
                  <ReportAssociatedEntity
                    id={reportDetail.target_id || ""}
                    type="user"
                    isDeleted={reportDetail.target_is_deleted}
                    isBanned={reportDetail.target_is_banned}
                    label="Reported User"
                    onUserAction={onUserAction}
                  />
                )}

                {reportDetail.target_type === "group" && (
                  <ReportAssociatedEntity
                    id={reportDetail.target_id || ""}
                    type="group"
                    isDeleted={reportDetail.target_is_deleted}
                    label="Reported Group"
                    onUserAction={onUserAction}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              Failed to load report details.
            </div>
          )}
        </div>

        {reportDetail?.status === "pending" && (
          <div className="p-4 border-t flex justify-end gap-2 bg-background">
            <Button
              variant="outline"
              onClick={() => {
                onReject(reportDetail);
              }}
            >
              Reject
            </Button>
            <Button
              onClick={() => {
                onResolve(reportDetail);
              }}
            >
              Resolve
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
