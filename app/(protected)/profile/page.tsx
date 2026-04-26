"use client";

import { useState, useRef, useCallback, DragEvent } from "react";
import { useSession } from "next-auth/react";
import {
  FiUploadCloud,
  FiUser,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

type Status = "idle" | "uploading" | "success" | "error";

const smallCaps = "uppercase tracking-[0.22em] text-[10px] font-medium";

function validate(f: File): string | null {
  if (!ALLOWED_TYPES.includes(f.type))
    return "Formato inválido. Use JPG, PNG ou WebP.";
  if (f.size > MAX_BYTES) return "Arquivo muito grande. Máximo 5 MB.";
  return null;
}

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = useCallback((f: File) => {
    const err = validate(f);
    if (err) {
      setErrorMsg(err);
      setStatus("error");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStatus("idle");
    setErrorMsg("");
  }, []);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) pick(f);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const onDragLeave = () => setDragActive(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) pick(f);
    // Reset input so re-selecting the same file triggers onChange
    e.target.value = "";
  };

  const upload = async () => {
    if (!file) return;
    setStatus("uploading");
    setErrorMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/user/avatar", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(json.error ?? "Erro ao enviar.");
        return;
      }
      // Atualiza a sessão JWT com a nova URL sem recarregar a página
      await update({ image: json.url });
      setPreview(null);
      setFile(null);
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Falha de rede. Tente novamente.");
    }
  };

  const currentAvatar = preview ?? session?.user?.image ?? null;
  const isUploading = status === "uploading";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-2xl px-6 py-10 sm:px-8">
        <header className="mb-10">
          <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
            Configurações · perfil
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Foto de perfil
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Arraste uma imagem ou clique para selecionar. JPG, PNG ou WebP —
            máx. 5 MB.
          </p>
        </header>

        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col items-center gap-6">
            {/* Avatar atual / prévia */}
            <div className="relative">
              {currentAvatar ? (
                <img
                  src={currentAvatar}
                  alt="Foto de perfil"
                  className="h-24 w-24 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-700"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 ring-2 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
                  <FiUser className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                </div>
              )}
              {preview && (
                <span className="absolute -bottom-1 -right-1 rounded-full bg-indigo-500 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                  Prévia
                </span>
              )}
            </div>

            {/* Dropzone */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Área de upload — arraste ou clique para selecionar imagem"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) =>
                e.key === "Enter" && inputRef.current?.click()
              }
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              className={`flex w-full cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                dragActive
                  ? "border-indigo-500 bg-indigo-50/60 dark:border-indigo-400 dark:bg-indigo-950/30"
                  : "border-gray-300 bg-gray-50/60 hover:border-indigo-400 hover:bg-indigo-50/30 dark:border-gray-700 dark:bg-gray-950/40 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/20"
              }`}
            >
              <div
                className={`rounded-full p-3 transition-colors ${
                  dragActive
                    ? "bg-indigo-100 dark:bg-indigo-900/40"
                    : "bg-gray-100 dark:bg-gray-800"
                }`}
              >
                <FiUploadCloud
                  className={`h-6 w-6 transition-colors ${
                    dragActive
                      ? "text-indigo-500"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {dragActive
                    ? "Solte a imagem aqui"
                    : "Arraste aqui ou clique para selecionar"}
                </p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                  JPG, PNG ou WebP — máx. 5 MB
                </p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onInputChange}
              />
            </div>

            {/* Feedback */}
            {status === "success" && (
              <div className="flex w-full items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <FiCheckCircle className="h-4 w-4 shrink-0" />
                <span>Foto de perfil atualizada com sucesso!</span>
              </div>
            )}
            {status === "error" && (
              <div className="flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <FiAlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Botão de salvar — só aparece quando há arquivo selecionado */}
            {file && (
              <button
                type="button"
                onClick={upload}
                disabled={isUploading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
              >
                {isUploading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-gray-900/30 dark:border-t-gray-900" />
                    Enviando…
                  </>
                ) : (
                  "Salvar foto"
                )}
              </button>
            )}
          </div>

          {/* Dados da conta */}
          <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-800">
            <dl className="space-y-3">
              <div className="flex items-center justify-between">
                <dt
                  className={`${smallCaps} text-gray-500 dark:text-gray-400`}
                >
                  Nome
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {session?.user?.name ?? "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt
                  className={`${smallCaps} text-gray-500 dark:text-gray-400`}
                >
                  Email
                </dt>
                <dd className="text-sm text-gray-900 dark:text-white">
                  {session?.user?.email ?? "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
