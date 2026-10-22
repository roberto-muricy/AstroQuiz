#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <UserNotifications/UserNotifications.h>

/**
 * Lembretes locais para voltar a jogar: agendados no próprio aparelho, sem
 * servidor e sem push remoto (não precisa de aps-environment). O JS decide
 * quando e o que dizer (src/services/lembreteService.ts); aqui só se agenda,
 * cancela e informa.
 */
@interface AstroQuizLembretes : NSObject <RCTBridgeModule>
@end

/**
 * Delegado da central de notificações. Precisa existir desde o lançamento do
 * app — o AppDelegate o instala antes de o React Native subir —, senão o toque
 * que abre o app frio se perde antes de o módulo nascer.
 */
@interface AQLembretesDelegado : NSObject <UNUserNotificationCenterDelegate>
+ (instancetype)compartilhado;
@end
