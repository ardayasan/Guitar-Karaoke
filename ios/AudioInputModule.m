#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE (AudioInputModule, RCTEventEmitter)

RCT_EXTERN_METHOD(start : (NSDictionary *)options)
RCT_EXTERN_METHOD(stop)
RCT_EXTERN_METHOD(setTunerString : (NSNumber *_Nullable)stringNo)

@end
