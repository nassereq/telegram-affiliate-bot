/**
 * Configurações para automação de navegador
 */

export const AUTOMATION_CONFIG = {
  // URL do site para automação
  url: process.env.AUTOMATION_URL || "https://exemplo.com",

  // Seletores CSS
  selectors: {
    // Seletor do botão principal
    button: process.env.AUTOMATION_BUTTON_SELECTOR || "#generate-button",

    // Seletor do link gerado
    generatedLink:
      process.env.AUTOMATION_RESULT_SELECTOR || ".generated-link",

    // Seletores de login (se necessário)
    loginForm: {
      username: "#username",
      password: "#password",
      submitButton: "button[type='submit']",
    },
  },

  // Tempo de espera padrão em segundos
  waitTime: parseInt(process.env.AUTOMATION_WAIT_SECONDS || "3", 10),

  // Credenciais (vindo de variáveis de ambiente)
  credentials: {
    username: process.env.AUTOMATION_USERNAME || "",
    password: process.env.AUTOMATION_PASSWORD || "",
  },

  // Configurações do navegador
  browser: {
    headless: process.env.NODE_ENV === "production",
    timeout: 30000, // 30 segundos
    viewport: {
      width: 1366,
      height: 768,
    },
  },

  // Cookies ou campos adicionais
  cookies: {
    sessionName: process.env.AUTOMATION_SESSION_COOKIE || "session_id",
  },
};

/**
 * Valida se todas as configurações necessárias estão presentes
 */
export function validateAutomationConfig(): {
  valid: boolean;
  missing: string[];
} {
  const required = [
    "AUTOMATION_URL",
    "AUTOMATION_USERNAME",
    "AUTOMATION_PASSWORD",
    "AUTOMATION_BUTTON_SELECTOR",
    "AUTOMATION_RESULT_SELECTOR",
  ];

  const missing = required.filter((key) => !process.env[key]);

  return {
    valid: missing.length === 0,
    missing,
  };
}
