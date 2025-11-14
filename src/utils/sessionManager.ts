import { ProductData } from "../types";

interface UserSession {
  step: "waiting_product_link" | "waiting_confirmation" | "waiting_manual_edit";
  productData?: ProductData;
  productUrl?: string;
  timestamp: number;
}

/**
 * Gerenciador de sessões dos usuários
 */
class SessionManager {
  private sessions: Map<number, UserSession> = new Map();
  private readonly SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutos

  /**
   * Inicia uma nova sessão para o usuário
   */
  startSession(userId: number): void {
    this.sessions.set(userId, {
      step: "waiting_product_link",
      timestamp: Date.now(),
    });
  }

  /**
   * Obtém a sessão do usuário
   */
  getSession(userId: number): UserSession | undefined {
    const session = this.sessions.get(userId);

    if (!session) return undefined;

    // Verifica timeout
    if (Date.now() - session.timestamp > this.SESSION_TIMEOUT) {
      this.clearSession(userId);
      return undefined;
    }

    return session;
  }

  /**
   * Atualiza os dados do produto na sessão
   */
  setProductData(
    userId: number,
    productUrl: string,
    productData: ProductData
  ): void {
    const session = this.getSession(userId);

    if (session) {
      session.productUrl = productUrl;
      session.productData = productData;
      session.step = "waiting_confirmation";
      session.timestamp = Date.now();
    }
  }

  /**
   * Atualiza parcialmente a sessão do usuário
   */
  updateSession(userId: number, updates: Partial<UserSession>): void {
    const session = this.getSession(userId);
    if (session) {
      Object.assign(session, updates);
      session.timestamp = Date.now();
    }
  }

  /**
   * Verifica se o usuário está aguardando confirmação
   */
  isWaitingConfirmation(userId: number): boolean {
    const session = this.getSession(userId);
    return session?.step === "waiting_confirmation";
  }

  /**
   * Limpa a sessão do usuário
   */
  clearSession(userId: number): void {
    this.sessions.delete(userId);
  }

  /**
   * Limpa sessões expiradas (executar periodicamente)
   */
  cleanExpiredSessions(): void {
    const now = Date.now();
    for (const [userId, session] of this.sessions.entries()) {
      if (now - session.timestamp > this.SESSION_TIMEOUT) {
        this.sessions.delete(userId);
      }
    }
  }
}

export default new SessionManager();
