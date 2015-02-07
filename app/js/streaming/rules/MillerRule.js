/** Algoritmo que considera características do buffer, implementado a partir do artigo TR5
 * 	@class MillerRule
 */
MediaPlayer.rules.MillerRule = function () {
    "use strict";
    
        var runningFastStart=true,
        	deltaTime=10000, 
        	deltaBuffer=1000, 
        	time1 = 0, 
        	t1 = 0,
        	      
        	insertThroughputs = function (throughList, availableRepresentations) {
        		var self = this, representation, bandwidth, quality, downloadTime, segDuration, through;
        		
        		for(var i = 0; i < throughList.length; i++){
        			if(throughList[i].bandwidth == null || throughList[i].bandwidth == 0){
        				quality = throughList[i].quality;
        				representation = availableRepresentations[quality];
        				bandwidth = self.metricsExt.getBandwidthForRepresentation(representation.id);
        				bandwidth /= 1000; //bit/ms
        				
        				downloadTime = throughList[i].finishTime.getTime() - throughList[i].responseTime.getTime();
        				segDuration = throughList[i].duration * 1000; 
        				
        				through = (throughList[i].sizeSeg * segDuration)/downloadTime; 
        				
        				self.debug.log("bandwidth: " + bandwidth);
        				self.debug.log("through: " + through);
        				
        	    		self.metricsBaselinesModel.updateThroughputSeg(throughList[i], bandwidth, through);
        			}
        		}
            };
        
        return {
            debug: undefined,
            manifestExt: undefined,
            metricsExt: undefined,
            metricsBaselineExt: undefined,
            metricsBaselinesModel: undefined,
            
            /**
             * @param {current} current - Índice da representação corrente
             * @param {metrics} metrics - Metricas armazenadas em MetricsList
             * @param {data} data - Dados de audio ou vídeo
             * @param {metricsBaseline} metricsBaseline - Metricas armazenadas em MetricsBaselineList
             * @memberof MillerRule#
             */
            
            checkIndex: function (current, metrics, data, metricsBaseline, availableRepresentations, type) {

                var self = this,
                httpRequestList = self.metricsExt.getHttpRequests(metrics),
                lastRequest = self.metricsExt.getLastHttpRequest(metrics),
                firstRequest = self.metricsExt.getFirstHttpRequest(metrics), 											//First Request n(0)
                currentBufferLevel  = self.metricsExt.getCurrentBufferLevel(metrics),		//b(t)
                bMin=8,
                bLow=12,
                bHigh=50,																//self.metricsExt.getMaxIndexForBufferType(lastRequest.stream)
                bOpt=0.5*(bLow+bHigh),
                downloadTime,															
                currentThrough,																	//p_n(t)
                time2,
                time,																		//current Time of session
                now = new Date(),															//current timestamp
                deferred,    
                ALPHA_1 = 0.75,
            	ALPHA_2 = 0.33,
            	ALPHA_3 = 0.5,
            	ALPHA_4 = 0.75,
                ALPHA_5 = 0.9,
                representation1,
                representation2,
                representation3,
                currentBandwidth,
                oneUpBandwidth,
                max,
                startRequest,
                bufferMinTime1 = 0,
                bufferMinTime2 = 0,
                averageThrough = 0,
                currentBandwidthMs = 0,
                bDelay = 0,
                sizeSeg;
                
            	self.debug.log("Baseline - Regra TR5 MillerRule...");
             	self.debug.log("Baseline - Tamanho HttpList: " + httpRequestList.length);
             	self.debug.log("Baseline - Tamanho BufferLevel: " + metrics.BufferLevel.length);
             	self.debug.log("Baseline - Tamanho Through: " + metricsBaseline.ThroughSeg.length);

                if (!metrics) {
                	//self.debug.log("No metrics, bailing.");
                	return Q.when(new MediaPlayer.rules.SwitchRequest());
                }
                
                if (!metricsBaseline) {
                	//self.debug.log("No metrics Baseline, bailing.");
                	return Q.when(new MediaPlayer.rules.SwitchRequest());
                }
                
                if (currentBufferLevel == null) {
                    //self.debug.log("No requests made for this stream yet, bailing.");
                    return Q.when(new MediaPlayer.rules.SwitchRequest());
                }
                
                if (lastRequest == null) {
                    //self.debug.log("No requests made for this stream yet, bailing.");
                    return Q.when(new MediaPlayer.rules.SwitchRequest());
                }

                if (firstRequest == null) {
                    //self.debug.log("No requests made for this stream yet, bailing.");
                    return Q.when(new MediaPlayer.rules.SwitchRequest());
                }

             	deferred = Q.defer();
             	
                //O início da sessão como um todo se acontece a partir do momento em que a primeira requisição de mídia é feita.
            	startRequest = firstRequest.trequest.getTime(); 
            	time = lastRequest.tfinish.getTime() - startRequest;
            	
            	if (time >= deltaTime){
            		t1 = time - deltaTime;
                }
            	
            	time2 = time1 + deltaBuffer + 1; 
            	
                sizeSeg = (lastRequest.trace[lastRequest.trace.length - 1].b) * 8;
            	downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime())/1000;
            	
            	max = self.manifestExt.getRepresentationCount1(data);
            	max -= 1;
            	representation1 = self.manifestExt.getRepresentationFor1(current, data);
            	currentBandwidth = self.manifestExt.getBandwidth1(representation1);
            	currentBandwidthMs = currentBandwidth/1000;
            	
            	currentThrough = (sizeSeg * lastRequest.mediaduration)/downloadTime ; 	//verificar valores
            	
            	insertThroughputs.call(self, metricsBaseline.ThroughSeg, availableRepresentations);
            	
        		self.debug.log("Baseline - time: " + time);
        		self.debug.log("Baseline - t1: " + t1);
        		self.debug.log("Baseline - time1: " + time1);
        		self.debug.log("Baseline - time2: " + time2);

            	/*for(var j = 0; j < metrics.BufferLevel.length; j++){
            		self.debug.log("Baseline - BufferLevel Number: " + j);
            		self.debug.log("Baseline -  t: " + (metrics.BufferLevel[j].t.getTime() - startRequest));
            		self.debug.log("Baseline -  level: " + metrics.BufferLevel[j].level);
            	}*/
				
            	if(runningFastStart){
            		bufferMinTime1 = self.metricsBaselineExt.getBufferMinTime(time1, deltaBuffer, metrics, startRequest);
                	self.debug.log("Baseline - bufferMinTime1: " + bufferMinTime1);
                	bufferMinTime2 = self.metricsBaselineExt.getBufferMinTime(time2, deltaBuffer, metrics, startRequest);
                	self.debug.log("Baseline - bufferMinTime2: " + bufferMinTime2);
            	}
        		self.debug.log("Antes de Average");

            	averageThrough = self.metricsBaselineExt.getAverageThrough(t1, time, metricsBaseline, startRequest);	
        		self.debug.log("Baseline - averageThrough: " + averageThrough);
        		
        		 if (isNaN(averageThrough)) {
                     self.debug.log("The averageThrough are NaN, bailing.");
             		 self.metricsBaselinesModel.addDelay(type, new Date, 0, current);
                     deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                 }else{
         			self.debug.log("Começa a regra");

                	 if(current != max){
             			representation2 = self.manifestExt.getRepresentationFor1(current+1, data);
                 		oneUpBandwidth = self.manifestExt.getBandwidth1(representation2);
                 		oneUpBandwidth /= 1000;
             		}

                	 if(runningFastStart &&
                             current != max &&
                             bufferMinTime1 <= bufferMinTime2 &&													//para todo t1<t2<=t *
                             currentBandwidthMs <= ALPHA_1 * averageThrough){ 
                          	
               			self.debug.log("runningFastStart");
                     	
                          if(currentBufferLevel.level < bMin){
                          	if(oneUpBandwidth <= ALPHA_2 * averageThrough){
                          		self.debug.log("Up ALPHA_2");
              					current += 1;
                          	}
                          }else if (currentBufferLevel.level < bLow){
                          	if(oneUpBandwidth <= ALPHA_3 * averageThrough){
                          		self.debug.log("Up ALPHA_3");
              					current += 1;
                          	}
                          }else{
                          	if(oneUpBandwidth <= ALPHA_4 * averageThrough){
                          		self.debug.log("Up ALPHA_4");
              					current += 1;
                          	}
                          	if(currentBufferLevel.level > bHigh){
                                 self.debug.log("Apply delay 1");
                                 bDelay = bHigh - lastRequest.mediaduration;
                          	}
                          }
                  		  self.metricsBaselinesModel.addDelay(type, new Date, bDelay , current);
                          deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
                       }else{
                		   self.debug.log("runningFastStart not true");
                    	   runningFastStart = false;
                    	                          	   
                           if(currentBufferLevel.level < bMin){
                                self.debug.log("Down MIN");
                                current = 0;
                           }else if(currentBufferLevel.level < bLow){
                                if(current != 0 && currentBandwidth >= currentThrough){
                                      self.debug.log("Down One");
                                      current -= 1;
                                }
                           }else if(currentBufferLevel.level < bHigh){
                        		 if(current == max || oneUpBandwidth >= ALPHA_5 * averageThrough){
                                        self.debug.log("Apply delay 2");
                                        bDelay = Math.max(currentBufferLevel.level - lastRequest.mediaduration, bOpt);
                        		 }
                           }else{
                        		 if(current == max || oneUpBandwidth >= ALPHA_5 * averageThrough){
                                       self.debug.log("Apply delay 3");
                                       bDelay = Math.max(currentBufferLevel.level - lastRequest.mediaduration, bOpt);
                        		 }else{
                                     	self.debug.log("Up One");
             								current += 1;
                        		 }
                           }
                           self.debug.log("Current: " + current);
                           self.debug.log("bDelay: " + bDelay);
                    	
                           self.metricsBaselinesModel.addDelay(type, new Date, bDelay , current);
                           deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));                            	   
                        }
                     }
        		 	time1 = time2 + 1;
        		 	
        		 	return deferred.promise;
       	}
       };
    };

MediaPlayer.rules.MillerRule.prototype = {
    constructor: MediaPlayer.rules.MillerRule
};