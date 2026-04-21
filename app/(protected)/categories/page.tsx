"use client";

import { useState, useEffect } from "react";
import { createCategory, getCategories, deleteCategory } from "./actions";
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
        <h1 className="text-3xl font-bold">Categorias</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
        >
          {showForm ? "Cancelar" : "Nova Categoria"}
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-8">
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Categoria
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Tipo
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="INCOME">Receita</option>
              <option value="EXPENSE">Despesa</option>
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-2">
              Cor (opcional)
            </label>
            <input
              type="color"
              id="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label htmlFor="icon" className="block text-sm font-medium text-gray-700 mb-2">
              Ícone (opcional)
            </label>
            <input
              type="text"
              id="icon"
              value={formData.icon}
              onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
              placeholder="Ex: 💰, 🏠, 🚗"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {isSubmitting ? "Criando..." : "Criar Categoria"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">Suas Categorias</h2>
        </div>

        {categories.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Nenhuma categoria encontrada. Crie sua primeira categoria acima.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {categories.map((category) => (
              <div key={category.id} className="px-6 py-4 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  {category.icon && <span className="text-xl">{category.icon}</span>}
                  <div>
                    <h3 className="font-medium">{category.name}</h3>
                    <p className="text-sm text-gray-500">
                      {category.type === "INCOME" ? "Receita" : "Despesa"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {category.color && (
                    <div
                      className="w-4 h-4 rounded-full border"
                      style={{ backgroundColor: category.color }}
                    />
                  )}
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="text-red-500 hover:text-red-700 px-2 py-1 rounded"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}