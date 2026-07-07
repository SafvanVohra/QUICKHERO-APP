import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft, CheckCircle2, Clock, FileText, Loader2, ShieldCheck, Upload, User, XCircle,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/verify")({
  head: () => ({ meta: [{ title: "Volunteer verification — QuickHero" }, { name: "robots", content: "noindex" }] }),
  component: VerifyPage,
});

type Verification = {
  id: string; status: "pending" | "approved" | "rejected";
  full_name: string; id_type: string; id_number: string;
  id_document_url: string | null; selfie_url: string | null;
  skills: string[] | null; notes: string | null;
  reviewer_notes: string | null; reviewed_at: string | null; created_at: string;
};

function VerifyPage() {
  const { user } = useAuth();
  const [existing, setExisting] = useState<Verification | null>(null);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState("");
  const [idType, setIdType] = useState("national_id");
  const [idNumber, setIdNumber] = useState("");
  const [skills, setSkills] = useState("");
  const [notes, setNotes] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("volunteer_verifications").select("*")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => {
        setExisting(data as Verification | null);
        setLoading(false);
      });
  }, [user]);

  const uploadFile = async (file: File, kind: "id" | "selfie") => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user!.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("verifications").upload(path, file, { upsert: true });
    if (error) throw error;
    return path;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName.trim() || !idNumber.trim()) return toast.error("Fill your legal name and ID number");
    if (!idFile) return toast.error("Upload your ID document");
    if (!selfieFile) return toast.error("Upload a selfie holding your ID");
    setSubmitting(true);
    try {
      const [idPath, selfiePath] = await Promise.all([
        uploadFile(idFile, "id"),
        uploadFile(selfieFile, "selfie"),
      ]);
      const { error } = await supabase.from("volunteer_verifications").insert({
        user_id: user.id,
        full_name: fullName.trim(),
        id_type: idType,
        id_number: idNumber.trim(),
        id_document_url: idPath,
        selfie_url: selfiePath,
        skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
        notes: notes.trim() || null,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Submitted — we'll review within 24 hours");
      const { data } = await supabase.from("volunteer_verifications").select("*")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setExisting(data as Verification | null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const statusColor = existing?.status === "approved" ? "bg-success text-success-foreground"
    : existing?.status === "rejected" ? "bg-danger text-danger-foreground"
    : "bg-warning text-warning-foreground";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pt-28 pb-20 sm:px-6">
        <Link to="/profile" className="inline-flex items-center gap-1.5 text-sm text-subtext hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to profile
        </Link>

        <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mt-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold sm:text-3xl">Become a verified volunteer</h1>
              <p className="text-sm text-subtext">Submit your ID once — we'll review it and unlock priority alerts.</p>
            </div>
          </div>

          {loading ? (
            <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : existing ? (
            <div className="mt-8 rounded-3xl border border-border bg-card p-8 shadow-soft">
              <Badge className={`rounded-full capitalize ${statusColor}`}>
                {existing.status === "approved" ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  : existing.status === "rejected" ? <XCircle className="mr-1 h-3.5 w-3.5" />
                  : <Clock className="mr-1 h-3.5 w-3.5" />}
                {existing.status}
              </Badge>
              <h2 className="mt-4 text-xl font-bold">
                {existing.status === "approved" ? "You're a verified hero 🎉"
                  : existing.status === "rejected" ? "We couldn't verify this submission"
                  : "Under review"}
              </h2>
              <div className="mt-4 space-y-2 text-sm text-subtext">
                <p><b className="text-foreground">Name:</b> {existing.full_name}</p>
                <p><b className="text-foreground">ID:</b> {existing.id_type.replace("_", " ")} · {existing.id_number}</p>
                {existing.skills?.length ? (
                  <p><b className="text-foreground">Skills:</b> {existing.skills.join(", ")}</p>
                ) : null}
                {existing.reviewer_notes && (
                  <div className="mt-3 rounded-2xl border border-border bg-muted/40 p-3 text-foreground">
                    <b>Reviewer note:</b> {existing.reviewer_notes}
                  </div>
                )}
              </div>
              {existing.status === "rejected" && (
                <Button className="mt-6 rounded-full bg-gradient-primary shadow-primary"
                  onClick={() => setExisting(null)}>
                  Submit again
                </Button>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-6 rounded-3xl border border-border bg-card p-6 shadow-soft sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-subtext">Legal full name</Label>
                  <div className="relative mt-1.5">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtext" />
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-11 pl-9" placeholder="As on your ID" required />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-subtext">ID type</Label>
                  <Select value={idType} onValueChange={setIdType}>
                    <SelectTrigger className="mt-1.5 h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="national_id">National ID</SelectItem>
                      <SelectItem value="passport">Passport</SelectItem>
                      <SelectItem value="drivers_license">Driver's License</SelectItem>
                      <SelectItem value="aadhaar">Aadhaar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-subtext">ID number</Label>
                  <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="mt-1.5 h-11" placeholder="Number on your ID" required />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-subtext">Skills (comma-separated)</Label>
                  <Input value={skills} onChange={(e) => setSkills(e.target.value)} className="mt-1.5 h-11" placeholder="First aid, CPR, driving, translator" />
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-subtext">Anything else? (optional)</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1.5" placeholder="Certifications, hours, etc." />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FileUploader label="ID document" icon={FileText} file={idFile} onFile={setIdFile} />
                <FileUploader label="Selfie holding your ID" icon={User} file={selfieFile} onFile={setSelfieFile} />
              </div>

              <p className="text-xs text-subtext">
                Your documents are stored privately. Only our review team and you can see them.
              </p>

              <Button type="submit" size="lg" disabled={submitting}
                className="w-full rounded-full bg-gradient-primary text-primary-foreground shadow-primary hover:opacity-95">
                {submitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-2 h-5 w-5" />}
                Submit for verification
              </Button>
            </form>
          )}
        </motion.div>
      </main>
    </div>
  );
}

function FileUploader({
  label, icon: Icon, file, onFile,
}: { label: string; icon: React.ComponentType<{ className?: string }>; file: File | null; onFile: (f: File | null) => void }) {
  return (
    <label className="group cursor-pointer rounded-2xl border-2 border-dashed border-border p-5 text-center transition-colors hover:border-primary/60 hover:bg-primary/5">
      <input type="file" accept="image/*,application/pdf" className="hidden"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {file ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Icon className="h-5 w-5" />}
      </span>
      <div className="mt-3 text-sm font-semibold">{label}</div>
      <div className="mt-1 text-xs text-subtext truncate">
        {file ? file.name : (
          <span className="inline-flex items-center gap-1"><Upload className="h-3 w-3" /> Click to upload</span>
        )}
      </div>
    </label>
  );
}
