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
        			quality = throughList[i].quality;
        			representation = availableRepresentations[quality];
        			bandwidth = self.metricsExt.getBandwidthForRepresentation(representation.id);
        			bandwidth /= 1000; //bit/ms
        			
        			downloadTime = throughList[i].finishTime.getTime() - throughList[i].responseTime.getTime();
        			segDuration = throughList[i].duration * 1000; 
        			
        			through = (bandwidth * segDuration)/downloadTime; 
        			
        			self.debug.log("bandwidth: " + bandwidth);
        			self.debug.log("through: " + through);
        			
            		self.metricsBaselinesModel.updateThroughputSeg(throughList[i], bandwidth, through);

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
            
            checkIndex: function (current, metrics, data, metricsBaseline, availableRepresentations) {

                var self = this,
                httpRequestList = self.metricsExt.getHttpRequests(metrics),
                lastRequest = self.metricsExt.getLastHttpRequest(metrics),
                firstRequest = self.metricsExt.getFirstHttpRequest(metrics), 											//First Request n(0)
                currentBufferLevel  = self.metricsExt.getCurrentBufferLevel(metrics),		//b(t)
                bMin=8000,
                bLow=16000,
                bHigh=40000,																//self.metricsExt.getMaxIndexForBufferType(lastRequest.stream)
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
                oneDownBandwidth, 
                max,
                startRequest,
                bufferMinTime1,
                bufferMinTime2,
                averageThrough,
                currentBandwidthMs = 0,
                p = MediaPlayer.rules.SwitchRequest.prototype.DEFAULT,
                bDelay = 0;
                
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

            	downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime())/1000;
            	
            	max = self.manifestExt.getRepresentationCount1(data);
            	max -= 1;
            	representation1 = self.manifestExt.getRepresentationFor1(current, data);
            	currentBandwidth = self.manifestExt.getBandwidth1(representation1);
            	currentBandwidthMs = currentBandwidth/1000;
            	
            	currentThrough = (currentBandwidth * lastRequest.mediaduration)/downloadTime ; 	//verificar valores
            	
            	insertThroughputs.call(self, metricsBaseline.ThroughSeg, availableRepresentations);
            	
        		/*self.debug.log("Baseline - lastRequest stream: " +lastRequest.stream);
        		if(lastRequest.responsecode)
            		self.debug.log("Baseline -  lastRequest responsecode: " + lastRequest.responsecode);
        		self.debug.log("Baseline -   lastRequest request: " + (lastRequest.trequest.getTime() - startRequest));
        		self.debug.log("Baseline -  lastRequest response: " + (lastRequest.tresponse.getTime()- startRequest));
            	self.debug.log("Baseline -  lastRequest finish: " + (lastRequest.tfinish.getTime()- startRequest));
        		self.debug.log("Baseline -  lastRequest url: " + lastRequest.url);
        		self.debug.log("Baseline -  lastRequest range: " + lastRequest.range);
        		self.debug.log("Baseline -  lastRequest type: " + lastRequest.type);
        		self.debug.log("Baseline -  lastRequest duration: " + lastRequest.mediaduration);
        		
            	for(var i = 0; i < httpRequestList.length; i++){
            			self.debug.log("Baseline - HttpList Number: " + i);
                		self.debug.log("Baseline - stream: " +httpRequestList[i].stream);
                		if(httpRequestList[i].responsecode)
                    		self.debug.log("Baseline -  responsecode: " + httpRequestList[i].responsecode);
                		self.debug.log("Baseline -   request: " + (httpRequestList[i].trequest.getTime() - startRequest));
                		self.debug.log("Baseline -  response: " + (httpRequestList[i].tresponse.getTime()- startRequest));
                    	self.debug.log("Baseline -  finish: " + (httpRequestList[i].tfinish.getTime()- startRequest));
                		self.debug.log("Baseline -  url: " + httpRequestList[i].url);
                		self.debug.log("Baseline -  range: " + httpRequestList[i].range);
                		self.debug.log("Baseline -  type: " + httpRequestList[i].type);
                		self.debug.log("Baseline -  duration: " + httpRequestList[i].mediaduration);
            	}
          		
            	for(var j = 0; j < metricsBaseline.ThroughSeg.length; j++){
            		self.debug.log("Baseline - ThroughSeg Number: " + j);
            		self.debug.log("Baseline -  start: " + (metricsBaseline.ThroughSeg[j].startTime.getTime() - startRequest));
            		self.debug.log("Baseline -  response: " + (metricsBaseline.ThroughSeg[j].responseTime.getTime() - startRequest));
            		self.debug.log("Baseline -  finish: " + (metricsBaseline.ThroughSeg[j].finishTime.getTime()- startRequest));
            		self.debug.log("Baseline -  range: " + metricsBaseline.ThroughSeg[j].range);
            		self.debug.log("Baseline -  duration: " + metricsBaseline.ThroughSeg[j].duration);
            		self.debug.log("Baseline -  bandwidth: " + metricsBaseline.ThroughSeg[j].bandwidth);
            		self.debug.log("Baseline -  throughSeg: " + metricsBaseline.ThroughSeg[j].throughSeg);
            	}
				*/
            	
            	bufferMinTime1 = self.metricsBaselineExt.getBufferMinTime(time1, deltaBuffer, metrics, startRequest);
            	self.debug.log("Baseline - bufferMinTime1: " + bufferMinTime1);
            	bufferMinTime2 = self.metricsBaselineExt.getBufferMinTime(time2, deltaBuffer, metrics, startRequest);
            	self.debug.log("Baseline - bufferMinTime2: " + bufferMinTime2);
        		averageThrough = self.metricsBaselineExt.getAverageThrough(t1, time, metricsBaseline, startRequest);	
        		self.debug.log("Baseline - averageThrough: " + averageThrough);
        		
        		 if (isNaN(averageThrough) || isNaN(bufferMinTime1) || isNaN(bufferMinTime2)) {
                     self.debug.log("The averageThrough are NaN, bailing.");
                     deferred.resolve(new MediaPlayer.rules.SwitchRequest(current, p, bDelay));
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
                                 bDelay = bHigh - (lastRequest.mediaduration*1000);
                          	}
                          }
                          deferred.resolve(new MediaPlayer.rules.SwitchRequest(current, p, bDelay));
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
                                        bDelay = Math.max(currentBuffer.level - (lastRequest.mediaduration*1000), bOpt);
                        		 }
                           }else{
                        		 if(current == max || oneUpBandwidth >= ALPHA_5 * averageThrough){
                                       self.debug.log("Apply delay 3");
                                       bDelay = Math.max(currentBuffer.level - (lastRequest.mediaduration*1000), bOpt);
                        		 }else{
                                     	self.debug.log("Up One");
             								current += 1;
                        		 }
                           }
                           self.debug.log("Current: " + current);
                           self.debug.log("bDelay: " + bDelay);

                           deferred.resolve(new MediaPlayer.rules.SwitchRequest(current, p, bDelay));                            	   
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