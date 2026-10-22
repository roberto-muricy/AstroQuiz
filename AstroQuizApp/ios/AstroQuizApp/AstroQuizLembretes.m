#import "AstroQuizLembretes.h"

static NSString *const AQPrefixo = @"astroquiz.lembrete.";
static NSString *const AQChaveAbertura = @"astroquiz.lembretes.abertoPor";

@implementation AQLembretesDelegado

+ (instancetype)compartilhado
{
  static AQLembretesDelegado *unico;
  static dispatch_once_t uma;
  dispatch_once(&uma, ^{ unico = [AQLembretesDelegado new]; });
  return unico;
}

// Com o app aberto, o lembrete não aparece: a pessoa já está jogando.
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions))completionHandler
{
  completionHandler(UNNotificationPresentationOptionNone);
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center
    didReceiveNotificationResponse:(UNNotificationResponse *)response
             withCompletionHandler:(void (^)(void))completionHandler
{
  NSString *id = response.notification.request.identifier;
  if ([id hasPrefix:AQPrefixo]) {
    [[NSUserDefaults standardUserDefaults] setObject:[id substringFromIndex:AQPrefixo.length]
                                              forKey:AQChaveAbertura];
  }
  completionHandler();
}

@end

@implementation AstroQuizLembretes

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

static BOOL AQAutorizado(UNNotificationSettings *ajustes)
{
  return ajustes.authorizationStatus == UNAuthorizationStatusAuthorized ||
         ajustes.authorizationStatus == UNAuthorizationStatusProvisional;
}

RCT_EXPORT_METHOD(permissaoConcedida:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  [[UNUserNotificationCenter currentNotificationCenter] getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings *ajustes) {
    resolve(@(AQAutorizado(ajustes)));
  }];
}

RCT_EXPORT_METHOD(pedirPermissao:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  UNAuthorizationOptions opcoes = UNAuthorizationOptionAlert | UNAuthorizationOptionSound;
  [[UNUserNotificationCenter currentNotificationCenter] requestAuthorizationWithOptions:opcoes
                                                                      completionHandler:^(BOOL concedida, NSError *erro) {
    resolve(@(concedida));
  }];
}

RCT_EXPORT_METHOD(agendar:(NSArray *)itens resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  UNUserNotificationCenter *central = [UNUserNotificationCenter currentNotificationCenter];
  [self cancelarPendentesEm:central depois:^{
    for (NSDictionary *item in itens) {
      NSString *id = item[@"id"];
      NSNumber *segundos = item[@"segundos"];
      if (![id isKindOfClass:[NSString class]] || ![segundos isKindOfClass:[NSNumber class]] || segundos.doubleValue < 1) continue;

      UNMutableNotificationContent *conteudo = [UNMutableNotificationContent new];
      conteudo.title = [item[@"titulo"] isKindOfClass:[NSString class]] ? item[@"titulo"] : @"";
      conteudo.body = [item[@"texto"] isKindOfClass:[NSString class]] ? item[@"texto"] : @"";
      conteudo.sound = [UNNotificationSound defaultSound];

      UNTimeIntervalNotificationTrigger *gatilho =
          [UNTimeIntervalNotificationTrigger triggerWithTimeInterval:segundos.doubleValue repeats:NO];
      UNNotificationRequest *pedido =
          [UNNotificationRequest requestWithIdentifier:[AQPrefixo stringByAppendingString:id] content:conteudo trigger:gatilho];
      [central addNotificationRequest:pedido withCompletionHandler:nil];
    }
    resolve(nil);
  }];
}

RCT_EXPORT_METHOD(cancelar:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  [self cancelarPendentesEm:[UNUserNotificationCenter currentNotificationCenter] depois:^{ resolve(nil); }];
}

/** O id do lembrete que abriu o app, uma vez só. */
RCT_EXPORT_METHOD(consumirAbertura:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
{
  NSUserDefaults *padrao = [NSUserDefaults standardUserDefaults];
  NSString *id = [padrao stringForKey:AQChaveAbertura];
  if (id) [padrao removeObjectForKey:AQChaveAbertura];
  resolve(id ?: [NSNull null]);
}

/** Só os lembretes deste módulo: nada de removeAll, que levaria qualquer outra notificação junto. */
- (void)cancelarPendentesEm:(UNUserNotificationCenter *)central depois:(void (^)(void))depois
{
  [central getPendingNotificationRequestsWithCompletionHandler:^(NSArray<UNNotificationRequest *> *pendentes) {
    NSMutableArray *ids = [NSMutableArray array];
    for (UNNotificationRequest *p in pendentes) {
      if ([p.identifier hasPrefix:AQPrefixo]) [ids addObject:p.identifier];
    }
    if (ids.count) [central removePendingNotificationRequestsWithIdentifiers:ids];
    depois();
  }];
}

@end
