/**
 * AstroQuiz Home Screen - Interactive Components
 * Funcionalidades interativas da tela Home
 */

class AstroQuizHomeScreen {
    constructor() {
        this.init();
    }

    init() {
        this.setupProgressBar();
        this.setupTabNavigation();
        this.setupStarAnimations();
        this.setupButtonInteractions();
        this.setupScrollAnimations();
        this.updateCurrentTime();
        this.startTimeUpdater();
    }

    // Configurar barra de progresso animada
    setupProgressBar() {
        const progressBar = document.querySelector('.main-level-progress-fill');
        if (progressBar) {
            // Animar progresso ao carregar
            setTimeout(() => {
                progressBar.style.width = progressBar.dataset.progress || '60%';
            }, 500);
        }
    }

    // Configurar navegação por tabs
    setupTabNavigation() {
        const tabItems = document.querySelectorAll('.tab-item-home');
        
        tabItems.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // Remover active de todos
                tabItems.forEach(item => {
                    item.classList.remove('tab-item-home-active');
                });
                
                // Adicionar active ao clicado
                tab.classList.add('tab-item-home-active');
                
                // Simular navegação (em uma app real, seria roteamento)
                const tabName = tab.dataset.tab;
                console.log(`Navegando para: ${tabName}`);
                
                // Feedback visual
                tab.style.transform = 'scale(0.95)';
                setTimeout(() => {
                    tab.style.transform = 'scale(1)';
                }, 150);
            });
        });
    }

    // Configurar animações das estrelas
    setupStarAnimations() {
        const starContainers = document.querySelectorAll('.level-card-stars');
        
        starContainers.forEach(container => {
            const stars = container.querySelectorAll('.level-card-star');
            
            // Animar estrelas ao aparecer
            stars.forEach((star, index) => {
                setTimeout(() => {
                    star.style.opacity = '0';
                    star.style.transform = 'scale(0.5)';
                    
                    setTimeout(() => {
                        star.style.transition = 'all 0.3s ease';
                        star.style.opacity = '1';
                        star.style.transform = 'scale(1)';
                    }, 100);
                }, index * 100);
            });
        });
    }

    // Configurar interações dos botões
    setupButtonInteractions() {
        // Botão continuar principal
        const continueBtn = document.querySelector('.main-level-continue-btn');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => {
                this.animateButtonPress(continueBtn);
                console.log('Continuando nível atual...');
            });
        }

        // Botões dos cards de nível
        const levelButtons = document.querySelectorAll('.level-card-button');
        levelButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!btn.classList.contains('level-card-button-locked')) {
                    this.animateButtonPress(btn);
                    const levelNumber = btn.closest('.level-progress-card').dataset.level;
                    console.log(`Abrindo nível ${levelNumber}...`);
                }
            });
        });

        // Card de desafio diário
        const dailyChallenge = document.querySelector('.daily-challenge-home');
        if (dailyChallenge) {
            dailyChallenge.addEventListener('click', () => {
                this.animateCardPress(dailyChallenge);
                console.log('Abrindo desafio diário...');
            });
        }

        // Card de ranking semanal
        const weeklyRanking = document.querySelector('.weekly-ranking-home');
        if (weeklyRanking) {
            weeklyRanking.addEventListener('click', () => {
                this.animateCardPress(weeklyRanking);
                console.log('Abrindo ranking semanal...');
            });
        }
    }

    // Configurar animações de scroll
    setupScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        // Observar elementos para animação
        const animatedElements = document.querySelectorAll(`
            .daily-challenge-home,
            .main-level-card-home,
            .weekly-ranking-home,
            .level-progress-card
        `);

        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'all 0.6s ease';
            observer.observe(el);
        });
    }

    // Atualizar horário atual
    updateCurrentTime() {
        const timeElement = document.querySelector('.status-time-home');
        if (timeElement) {
            const now = new Date();
            const hours = now.getHours().toString().padStart(2, '0');
            const minutes = now.getMinutes().toString().padStart(2, '0');
            timeElement.textContent = `${hours}:${minutes}`;
        }
    }

    // Iniciar atualizador de tempo
    startTimeUpdater() {
        // Atualizar a cada minuto
        setInterval(() => {
            this.updateCurrentTime();
        }, 60000);
    }

    // Animação de pressão de botão
    animateButtonPress(button) {
        button.style.transform = 'scale(0.95)';
        button.style.opacity = '0.8';
        
        setTimeout(() => {
            button.style.transform = 'scale(1)';
            button.style.opacity = '1';
        }, 150);
    }

    // Animação de pressão de card
    animateCardPress(card) {
        card.style.transform = 'scale(0.98)';
        card.style.opacity = '0.9';
        
        setTimeout(() => {
            card.style.transform = 'scale(1)';
            card.style.opacity = '1';
        }, 200);
    }

    // Simular carregamento de dados
    static loadUserData() {
        return {
            user: {
                name: 'Roberto',
                level: 7,
                avatar: '/assets/images/misc/home.png',
                streak: 12,
                xp: 2450
            },
            currentLevel: {
                number: 7,
                name: 'Marés',
                subtitle: 'Explorador Intermediário',
                progress: 60,
                questions: { completed: 6, total: 10 },
                xpToNext: 20,
                stars: 2
            },
            nextLevel: {
                number: 8,
                name: 'Atmosfera',
                subtitle: 'Intermediário',
                locked: true,
                questions: { completed: 0, total: 10 },
                xp: 0,
                stars: 0
            },
            dailyChallenge: {
                title: 'Desafio diário',
                description: 'Acerte 15 perguntas',
                reward: '+150 xp',
                completed: false
            },
            ranking: {
                position: 20,
                change: 8,
                period: 'semanal'
            }
        };
    }

    // Atualizar dados da interface
    static updateInterface(data) {
        // Atualizar nome do usuário
        const welcomeText = document.querySelector('.welcome-text');
        if (welcomeText) {
            welcomeText.textContent = `Bem-vindo de volta, ${data.user.name}!`;
        }

        // Atualizar streak
        const streakBadge = document.querySelector('.streak-badge-home');
        if (streakBadge) {
            streakBadge.innerHTML = `🔥 ${data.user.streak} dias seguidos`;
        }

        // Atualizar badge do avatar
        const avatarBadge = document.querySelector('.avatar-level-badge-home');
        if (avatarBadge) {
            avatarBadge.textContent = data.user.level;
        }

        // Atualizar card principal
        const levelTitle = document.querySelector('.main-level-card-home h3');
        if (levelTitle) {
            levelTitle.textContent = `Nível ${data.currentLevel.number} - ${data.currentLevel.name}`;
        }

        // Atualizar progresso
        const progressBar = document.querySelector('.main-level-progress-fill');
        if (progressBar) {
            progressBar.dataset.progress = `${data.currentLevel.progress}%`;
        }

        // Atualizar ranking
        const rankingBadge = document.querySelector('.weekly-ranking-badge');
        if (rankingBadge) {
            rankingBadge.textContent = `#${data.ranking.position}`;
        }
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Carregar dados do usuário
    const userData = AstroQuizHomeScreen.loadUserData();
    AstroQuizHomeScreen.updateInterface(userData);
    
    // Inicializar funcionalidades
    new AstroQuizHomeScreen();
    
    // Log de inicialização
    console.log('🎮 AstroQuiz Home Screen inicializada!');
    console.log('📊 Dados do usuário carregados:', userData);
});

// Exportar para uso externo
window.AstroQuizHomeScreen = AstroQuizHomeScreen;

