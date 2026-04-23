"use client";

import { useState, useEffect } from "react";
import { createCategory, getCategories, deleteCategory, updateCategory } from "./actions";
import { Category } from "@prisma/client";

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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const result = await getCategories();
      if (result.success) {
        setCategories(result.data || []);
      } else {
        setMessage({ type: "error", text: result.error || "Erro ao carregar categorias" });
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
        setMessage({ type: "success", text: result.message || "Categoria criada com sucesso!" });
        setFormData({ name: "", type: "INCOME", color: "", icon: "" });
        setShowForm(false);
        await loadCategories();
      } else {
        setMessage({ type: "error", text: result.error || "Erro ao criar categoria" });
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
        setMessage({ type: "success", text: result.message || "Categoria atualizada!" });
        cancelEdit();
        await loadCategories();
      } else {
        setMessage({ type: "error", text: result.error || "Erro ao atualizar categoria" });
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
        setMessage({ type: "success", text: "Categoria excluída com sucesso!" });
        await loadCategories();
      } else {
        setMessage({ type: "error", text: result.error || "Erro ao excluir categoria" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Erro ao excluir categoria" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold dark:text-gray-100">Categorias</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded dark:bg-blue-600 dark:hover:bg-blue-500"
        >
          {showForm ? "Cancelar" : "Nova Categoria"}
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded ${message.type === "success" ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8 dark:bg-gray-900 dark:shadow-gray-900/50">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              Nome da Categoria
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              Tipo
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
            >
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              Cor (opcional)
            </label>
            <input
              type="color"
              id="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="icon" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              Ícone (opcional)
            </label>
            <input
              type="text"
              id="icon"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="Ex: 💰, 🏠, 🚗"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {isSubmitting ? "Criando..." : "Criar Categoria"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-md dark:bg-gray-900 dark:shadow-gray-900/50">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-xl font-semibold dark:text-gray-100">Suas Categorias</h2>
        </div>

        {categories.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            Nenhuma categoria encontrada. Crie sua primeira categoria acima.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {categories.map((category) => {
              const isEditing = editingId === category.id;
              return (
                <div key={category.id} className="px-6 py-4">
                  <div className="flex justify-between items-center gap-4 flex-wrap">
                    <div className="flex items-center space-x-3 min-w-0">
                      {category.icon && <span className="text-xl">{category.icon}</span>}
                      <div>
                        <h3 className="font-medium dark:text-gray-100">
                          {category.name}
                          {category.systemKey && (
                            <span className="ml-2 text-xs font-normal text-indigo-600 dark:text-indigo-400">
                              (padrão)
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {category.type === "INCOME" ? "Receita" : "Despesa"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {category.color && (
                        <div
                          className="w-4 h-4 rounded-full border dark:border-gray-700"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      {!isEditing && (
                        <>
                          <button
                            onClick={() => startEdit(category)}
                            className="text-indigo-600 hover:text-indigo-800 text-sm px-2 py-1 rounded dark:text-indigo-400 dark:hover:text-indigo-300"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded dark:text-red-400 dark:hover:text-red-300"
                          >
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {isEditing && (
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        placeholder="Nome"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editData.icon}
                        onChange={(e) => setEditData({ ...editData, icon: e.target.value })}
                        placeholder="Ícone (ex: 💰)"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                      />
                      <input
                        type="color"
                        value={editData.color || "#000000"}
                        onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                      />
                      <div className="md:col-span-3 flex gap-2">
                        <button
                          onClick={() => submitEdit(category.id)}
                          disabled={isSubmitting}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={isSubmitting}
                          className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded dark:text-gray-300 dark:hover:text-gray-100"
                        >
                          Cancelar
                        </button>
                      </div>
                      <p className="md:col-span-3 text-xs text-gray-500 dark:text-gray-400">
                        Tipo (Receita/Despesa) não pode ser alterado para manter consistência com transações existentes.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}