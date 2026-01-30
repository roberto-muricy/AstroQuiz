/**
 * Legal Routes
 * Serves Privacy Policy and Terms of Service pages
 */

const PRIVACY_POLICY_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Política de Privacidade - AstroQuiz</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #5E4A8B; border-bottom: 3px solid #5E4A8B; padding-bottom: 10px; }
        h2 { color: #2C1B47; margin-top: 30px; }
        .contact { background: #f0ebf7; padding: 20px; border-radius: 8px; margin-top: 30px; }
        .updated { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Política de Privacidade / Privacy Policy</h1>
        <p class="updated">Última atualização / Last updated: Janeiro 2026</p>

        <h2>Português</h2>
        <p>A <strong>Loopwise Studio</strong> opera o aplicativo <strong>AstroQuiz</strong>.</p>

        <h2>1. Dados que Coletamos</h2>
        <ul>
            <li><strong>Dados de conta:</strong> Nome, email e foto de perfil (se você criar conta via Google ou email).</li>
            <li><strong>Dados de progresso:</strong> Pontuação, fases completadas, conquistas e estatísticas de jogo.</li>
            <li><strong>Dados do dispositivo:</strong> Tipo de dispositivo e sistema operacional para análise.</li>
        </ul>

        <h2>2. Como Usamos seus Dados</h2>
        <ul>
            <li>Fornecer e manter o Serviço</li>
            <li>Salvar e sincronizar seu progresso entre dispositivos</li>
            <li>Melhorar a experiência do usuário</li>
        </ul>

        <h2>3. Armazenamento</h2>
        <p>Dados são salvos localmente no dispositivo. Se você criar conta, são sincronizados com nossos servidores seguros (Firebase).</p>

        <h2>4. Compartilhamento</h2>
        <p><strong>Não vendemos seus dados.</strong> Compartilhamos apenas com provedores de serviço (Firebase) ou se exigido por lei.</p>

        <h2>5. Seus Direitos</h2>
        <p>Você pode acessar, corrigir ou excluir seus dados a qualquer momento. Pode jogar sem criar conta.</p>

        <h2>6. Menores</h2>
        <p>O app é adequado para todas as idades. Não coletamos dados de menores de 13 anos sem consentimento dos pais.</p>

        <div class="contact">
            <h2>Contato / Contact</h2>
            <p><strong>Loopwise Studio</strong><br>Email: <a href="mailto:robertomuricy@gmail.com">robertomuricy@gmail.com</a></p>
        </div>
    </div>
</body>
</html>`;

const TERMS_OF_SERVICE_HTML = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Termos de Uso - AstroQuiz</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #5E4A8B; border-bottom: 3px solid #5E4A8B; padding-bottom: 10px; }
        h2 { color: #2C1B47; margin-top: 30px; }
        .contact { background: #f0ebf7; padding: 20px; border-radius: 8px; margin-top: 30px; }
        .updated { color: #666; font-size: 0.9em; }
        .highlight { background: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Termos de Uso / Terms of Service</h1>
        <p class="updated">Última atualização / Last updated: Janeiro 2026</p>

        <h2>Português</h2>
        <p>Ao usar o <strong>AstroQuiz</strong>, você concorda com estes Termos.</p>

        <h2>1. Descrição do Serviço</h2>
        <p>AstroQuiz é um app de quiz educacional sobre astronomia com perguntas, sistema de progressão, conquistas e múltiplos idiomas.</p>

        <h2>2. Conta de Usuário</h2>
        <ul>
            <li><strong>Sem conta:</strong> Progresso salvo apenas no dispositivo.</li>
            <li><strong>Com conta:</strong> Progresso sincronizado na nuvem.</li>
        </ul>

        <h2>3. Uso Aceitável</h2>
        <p>Não tente hackear, modificar ou manipular pontuações de forma fraudulenta.</p>

        <h2>4. Propriedade Intelectual</h2>
        <p>Todo conteúdo (perguntas, imagens, design, código) é propriedade da <strong>Loopwise Studio</strong>.</p>

        <h2>5. Conteúdo Educacional</h2>
        <div class="highlight">
            <p><strong>Aviso:</strong> AstroQuiz é educacional para entretenimento. Para informações científicas oficiais, consulte fontes acadêmicas.</p>
        </div>

        <h2>6. Limitação de Responsabilidade</h2>
        <p>O app é fornecido "como está". Não nos responsabilizamos por perda de dados ou interrupções.</p>

        <h2>7. Lei Aplicável</h2>
        <p>Estes Termos são regidos pelas leis do Brasil.</p>

        <div class="contact">
            <h2>Contato / Contact</h2>
            <p><strong>Loopwise Studio</strong><br>Email: <a href="mailto:robertomuricy@gmail.com">robertomuricy@gmail.com</a></p>
        </div>
    </div>
</body>
</html>`;

export function createLegalRoutes(): any[] {
  return [
    // Privacy Policy
    {
      method: 'GET',
      path: '/privacy-policy',
      handler: async (ctx: any) => {
        ctx.type = 'text/html';
        ctx.body = PRIVACY_POLICY_HTML;
      },
      config: { auth: false },
    },

    // Terms of Service
    {
      method: 'GET',
      path: '/terms-of-service',
      handler: async (ctx: any) => {
        ctx.type = 'text/html';
        ctx.body = TERMS_OF_SERVICE_HTML;
      },
      config: { auth: false },
    },

    // Aliases
    {
      method: 'GET',
      path: '/privacy',
      handler: async (ctx: any) => {
        ctx.redirect('/privacy-policy');
      },
      config: { auth: false },
    },
    {
      method: 'GET',
      path: '/terms',
      handler: async (ctx: any) => {
        ctx.redirect('/terms-of-service');
      },
      config: { auth: false },
    },
  ];
}
