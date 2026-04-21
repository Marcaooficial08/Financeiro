// 🎨 CONFIGURAÇÕES DE NOTIFICAÇÕES
export const NOTIFICATION_CONFIG = {
  duration: 4000, // 4 segundos - suficiente para leitura
  richColors: true,
  closeButton: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  position: "top-right" as const,
}

// 🎯 TIPOS DE NOTIFICAÇÃO
export type NotificationType = "success" | "error" | "warning" | "info"

// 📋 MENSAGENS PADRÃO EM PORTUGUÊS
export const messages = {
  // ✅ SUCESSO
  success: {
    delete: "✅ Dados excluídos com sucesso!",
    create: "✅ Registro criado com sucesso!",
    update: "✅ Registro atualizado com sucesso!",
    save: "✅ Alterações salvas com sucesso!",
    login: "✅ Login realizado com sucesso!",
    register: "✅ Conta criada com sucesso!",
    resetPassword: "✅ Senha redefinida com sucesso!",
    transaction: "✅ Transação registrada com sucesso!",
    export: "✅ Dados exportados com sucesso!",
  },

  // ❌ ERRO
  error: {
    delete: "❌ Erro ao excluir. Tente novamente.",
    create: "❌ Erro ao criar. Verifique os dados e tente novamente.",
    update: "❌ Erro ao atualizar. Tente novamente.",
    save: "❌ Erro ao salvar. Verifique os campos e tente novamente.",
    login: "❌ Credenciais inválidas. Verifique email e senha.",
    register: "❌ Erro ao criar conta. Email já existe ou dados inválidos.",
    resetPassword: "❌ Token inválido ou expirado. Solicite nova redefinição.",
    transaction: "❌ Erro ao registrar transação. Verifique os dados.",
    export: "❌ Erro ao exportar dados. Tente novamente mais tarde.",
    server: "❌ Erro no servidor. Tente novamente mais tarde.",
    network: "❌ Sem conexão. Verifique sua internet e tente novamente.",
  },

  // ⚠️ AVISO
  warning: {
    delete: "⚠️ Tem certeza? Esta ação não pode ser desfeita.",
    confirm: "⚠️ Por favor, confirme a ação.",
    empty: "⚠️ Nenhum dado encontrado.",
  },

  // ℹ️ INFORMAÇÃO
  info: {
    default: "ℹ️ Operação em andamento...",
    loading: "⏳ Por favor, aguarde...",
  },
}

// 🎯 EXPORTAÇÃO PADRÃO PARA TOASTS
export const toastOptions = {
  duration: NOTIFICATION_CONFIG.duration,
  richColors: NOTIFICATION_CONFIG.richColors,
  closeButton: NOTIFICATION_CONFIG.closeButton,
  pauseOnFocusLoss: NOTIFICATION_CONFIG.pauseOnFocusLoss,
  pauseOnHover: NOTIFICATION_CONFIG.pauseOnHover,
  position: NOTIFICATION_CONFIG.position,
}

// 📝 TRADUTOR DE MENSAGENS
export function getMessage(type: NotificationType, action: string, defaultMsg: string = ""): string {
  const section = messages[type] as Record<string, string>
  const messageMap = section[action]
  return messageMap || defaultMsg
}

// 🔄 CLASSES CSS ADICIONAIS PARA CORES ESPECÍFICAS
export const getStyleClasses = (type: NotificationType) => {
  switch (type) {
    case "success":
      return "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
    case "error":
      return "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
    case "warning":
      return "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300"
    case "info":
      return "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
  }
}

// 📌 NOTIFICAÇÃO CENTRALIZADA
export function showNotification(type: NotificationType, action: string, customMessage?: string) {
  const section = messages[type] as Record<string, string>
  const message = customMessage || section[action] || messages.info.default

  if (typeof window === "undefined") {
    return
  }

  // Usar sonner se disponível
  if ((window as any).sonner) {
    const notification = (window as any).sonner?.notification({
      message,
      type: type === "error" ? "destructive" : "default",
      duration: toastOptions.duration,
    })
    return notification
  }

  // Fallback: criar elemento visual
  const toast = document.createElement("div")
  toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 ${getStyleClasses(type)}`
  toast.innerHTML = `
    <div class="flex items-start gap-3">
      <div class="text-2xl">${type === "error" ? "❌" : type === "success" ? "✅" : "⚠️"}</div>
      <div>
        <div class="font-medium text-sm">${message}</div>
      </div>
    </div>
  `
  document.body.appendChild(toast)

  // Animação de saída
  setTimeout(() => {
    toast.style.opacity = "0"
    toast.style.transform = "translateX(100px)"
    setTimeout(() => toast.remove(), 300)
  }, toastOptions.duration)
}