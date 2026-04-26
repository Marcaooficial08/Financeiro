"use client";

import { useState, useEffect } from "react";
import {
  createCategory,
  getCategories,
  deleteCategory,
  updateCategory,
} from "./actions";
type Category = {
  id: string;
  userId: string;
  name: string;
  type: string;
  icon: string | null;
  color: string | null;
  systemKey: string | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const smallCaps = "uppercase tracking-[0.22em] text-[10px] font-medium";

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:placeholder-gray-600";

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200";

const ghostBtn =
  "inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "INCOME" as const,
    color: "",
    icon: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", color: "", icon: "" });
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const result = await getCategories();
      if (result.success) {
        setCategories(result.data || []);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Erro ao carregar categorias",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao carregar categorias" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("type", formData.type);
    if (formData.color) data.append("color", formData.color);
    if (formData.icon) data.append("icon", formData.icon);

    try {
      const result = await createCategory(data);
      if (result.success) {
        setMessage({
          type: "success",
          text: result.message || "Categoria criada com sucesso!",
        });
        setFormData({ name: "", type: "INCOME", color: "", icon: "" });
        setShowForm(false);
        await loadCategories();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Erro ao criar categoria",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao criar categoria" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setEditData({
      name: category.name,
      color: category.color ?? "",
      icon: category.icon ?? "",
    });
    setMessage(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({ name: "", color: "", icon: "" });
  };

  const submitEdit = async (categoryId: string) => {
    setIsSubmitting(true);
    const data = new FormData();
    data.append("name", editData.name);
    if (editData.color) data.append("color", editData.color);
    if (editData.icon) data.append("icon", editData.icon);

    try {
      const result = await updateCategory(categoryId, data);
      if (result.success) {
        setMessage({
          type: "success",
          text: result.message || "Categoria atualizada!",
        });
        cancelEdit();
        await loadCategories();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Erro ao atualizar categoria",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao atualizar categoria" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

    try {
      const result = await deleteCategory(categoryId);
      if (result.success) {
        setMessage({
          type: "success",
          text: "Categoria excluída com sucesso!",
        });
        await loadCategories();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Erro ao excluir categoria",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao excluir categoria" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className={`${smallCaps} text-gray-500 dark:text-gray-400`}
        >
          Carregando…
        </div>
      </div>
    );
  }

  const sorted = [...categories].sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }),
  );
  const incomeCats = sorted.filter((c) => c.type === "INCOME");
  const expenseCats = sorted.filter((c) => c.type === "EXPENSE");

  const renderCard = (category: Category) => {
    const isEditing = editingId === category.id;
    const accent = category.color ?? "#6366f1";
    return (
      <article
        key={category.id}
        className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700"
      >
        <div
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: accent }}
          aria-hidden
        />
        <div className="flex items-start justify-between gap-3 p-5 pl-6">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
              style={{
                background: `${accent}1a`,
                color: accent,
              }}
              aria-hidden
            >
              {category.icon || "•"}
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-medium text-gray-900 dark:text-gray-100">
                {category.name}
                {category.systemKey && (
                  <span
                    className={`${smallCaps} ml-2 rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300`}
                  >
                    Padrão
                  </span>
                )}
              </h3>
              <p
                className={`${smallCaps} mt-1 text-gray-400 dark:text-gray-500`}
              >
                {category.type === "INCOME" ? "Receita" : "Despesa"}
              </p>
            </div>
          </div>
          {!isEditing && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => startEdit(category)}
                className="rounded-lg px-2.5 py-1.5 text-xs text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(category.id)}
                className="rounded-lg px-2.5 py-1.5 text-xs text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
              >
                Excluir
              </button>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="border-t border-gray-100 bg-gray-50/60 p-5 dark:border-gray-800 dark:bg-gray-950/40">
            <div className="grid gap-3 md:grid-cols-[1fr_140px_64px]">
              <div>
                <label
                  className={`${smallCaps} mb-1.5 block text-gray-500 dark:text-gray-400`}
                >
                  Nome
                </label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) =>
                    setEditData({ ...editData, name: e.target.value })
                  }
                  placeholder="Nome"
                  className={inputCls}
                  autoFocus
                />
              </div>
              <div>
                <label
                  className={`${smallCaps} mb-1.5 block text-gray-500 dark:text-gray-400`}
                >
                  Ícone
                </label>
                <input
                  type="text"
                  value={editData.icon}
                  onChange={(e) =>
                    setEditData({ ...editData, icon: e.target.value })
                  }
                  placeholder="💰"
                  className={inputCls}
                />
              </div>
              <div>
                <label
                  className={`${smallCaps} mb-1.5 block text-gray-500 dark:text-gray-400`}
                >
                  Cor
                </label>
                <input
                  type="color"
                  value={editData.color || "#6366f1"}
                  onChange={(e) =>
                    setEditData({ ...editData, color: e.target.value })
                  }
                  className="h-[42px] w-full cursor-pointer rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={() => submitEdit(category.id)}
                disabled={isSubmitting}
                className={primaryBtn}
              >
                Salvar
              </button>
              <button
                onClick={cancelEdit}
                disabled={isSubmitting}
                className={ghostBtn}
              >
                Cancelar
              </button>
              <p className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                Tipo não pode ser alterado.
              </p>
            </div>
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={`${smallCaps} text-gray-400`}>03 · Taxonomia</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Categorias
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Organize receitas e despesas com ícones e cores.
          </p>
        </div>
        <button onClick={() => setShowForm((p) => !p)} className={primaryBtn}>
          {showForm ? "Cancelar" : "+ Nova categoria"}
        </button>
      </header>

      {message && (
        <div
          role="alert"
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          }`}
        >
          <span
            className={`mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full ${
              message.type === "success" ? "bg-emerald-500" : "bg-rose-500"
            }`}
            aria-hidden
          />
          <span>{message.text}</span>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <div className="mb-5">
            <p className={`${smallCaps} text-gray-400`}>Nova categoria</p>
            <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              Detalhes
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="name"
                className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
              >
                Nome
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className={inputCls}
                required
              />
            </div>

            <div>
              <label
                className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
              >
                Tipo
              </label>
              <div
                role="tablist"
                className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-950"
              >
                {(
                  [
                    { v: "INCOME", label: "Receita", color: "#10b981" },
                    { v: "EXPENSE", label: "Despesa", color: "#ef4444" },
                  ] as const
                ).map((opt) => {
                  const active = formData.type === opt.v;
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() =>
                        setFormData({ ...formData, type: opt.v as any })
                      }
                      className={`px-4 py-2 text-sm font-medium transition ${
                        active
                          ? "rounded-lg bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                          : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ background: opt.color }}
                          aria-hidden
                        />
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label
                htmlFor="icon"
                className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
              >
                Ícone <span className="text-gray-400">(emoji)</span>
              </label>
              <input
                type="text"
                id="icon"
                value={formData.icon}
                onChange={(e) =>
                  setFormData({ ...formData, icon: e.target.value })
                }
                placeholder="Ex: 💰, 🏠, 🚗"
                className={inputCls}
              />
            </div>

            <div>
              <label
                htmlFor="color"
                className={`${smallCaps} mb-2 block text-gray-500 dark:text-gray-400`}
              >
                Cor
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  id="color"
                  value={formData.color || "#6366f1"}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="h-[42px] w-14 cursor-pointer rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  placeholder="#6366f1"
                  className={inputCls}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={primaryBtn + " mt-5 w-full"}
          >
            {isSubmitting ? "Criando…" : "Criar categoria"}
          </button>
        </form>
      )}

      <section className="space-y-8">
        <div>
          <div className="mb-4 flex items-center gap-3">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "#10b981" }}
              aria-hidden
            />
            <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
              Receitas
            </p>
            <span className="text-xs tabular-nums text-gray-400">
              {incomeCats.length}
            </span>
          </div>
          {incomeCats.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-6 py-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
              Nenhuma categoria de receita.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {incomeCats.map(renderCard)}
            </div>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center gap-3">
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: "#ef4444" }}
              aria-hidden
            />
            <p className={`${smallCaps} text-gray-500 dark:text-gray-400`}>
              Despesas
            </p>
            <span className="text-xs tabular-nums text-gray-400">
              {expenseCats.length}
            </span>
          </div>
          {expenseCats.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-6 py-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
              Nenhuma categoria de despesa.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {expenseCats.map(renderCard)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
