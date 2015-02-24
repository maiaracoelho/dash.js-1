/** Algoritmo que considera características do buffer, implementado a partir do artigo TR5
 * 	@class MillerRule
 */
MediaPlayer.rules.MillerRule = function () {
    "use strict";
    
        var runningFastStart=true,
        	deltaTime=10000, 
        	deltaBuffer=1,

        	        	      
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
            
            checkIndex: function (current, metrics, data, metricsBaseline, availableRepresentations) {

                var self = this,
                lastRequest = self.metricsExt.getLastHttpRequest(metrics),
                firstRequest = self.metricsExt.getFirstHttpRequest(metrics), 											//First Request n(0)
                currentBufferLevel  = self.metricsExt.getCurrentBufferLevel(metrics),									//b(t)
                bMin=5,
                bLow=8,
                bHigh=13,																								//self.metricsExt.getMaxIndexForBufferType(lastRequest.stream)
                bOpt=0.5*(bLow+bHigh),
                downloadTime,															
                currentThrough,																							//p_n(t)
                time = 0, 
                t1 = 0,
                deferred,    
                ALPHA_1 = 0.75,
            	ALPHA_2 = 0.33,
            	ALPHA_3 = 0.5,
            	ALPHA_4 = 0.75,
                ALPHA_5 = 0.9,
                representation1,
                representation2,
                currentBandwidth,
                oneUpBandwidth,
                max,
                startRequest = 0,
                averageThrough,
                currentBandwidthMs = 0,
                bDelay = 0,
                sizeSeg;
                
            	self.debug.log("Baseline - Regra TR5 MillerRule...");
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
             	
            	insertThroughputs.call(self, metricsBaseline.ThroughSeg, availableRepresentations);
            	
            	if (lastRequest.stream == "audio"){
					self.debug.log("No change0.");
		            return Q.when(new MediaPlayer.rules.SwitchRequest(current));
            	}
            	
                //O início da sessão como um todo so acontece a partir do momento em que a primeira requisição de mídia é feita.
            	startRequest = firstRequest.trequest.getTime(); 
            	time = lastRequest.tfinish.getTime() - startRequest;

            	//startRequest = firstRequest.startTime.getTime(); 
            	//time = lastRequest.finishTime.getTime() - startRequest;
            	
            	if (time >= deltaTime){
            		t1 = time - deltaTime;
                }
            	
                sizeSeg = (lastRequest.trace[lastRequest.trace.length - 1].b) * 8;
            	downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime())/1000;
               
            	//sizeSeg = lastRequest.sizeSeg;
            	//downloadTime = (lastRequest.finishTime.getTime() - lastRequest.responseTime.getTime())/1000;

            	max = self.manifestExt.getRepresentationCount1(data);
            	max -= 1;
            	representation1 = self.manifestExt.getRepresentationFor1(current, data);
            	currentBandwidth = self.manifestExt.getBandwidth1(representation1);
            	currentBandwidthMs = currentBandwidth/1000;
            	currentThrough = (sizeSeg * lastRequest.mediaduration)/downloadTime; 	
            	
        		self.debug.log("Baseline - currentThrough: " + currentThrough + " bits/s");
				self.debug.log("Baseline - time: " + time);
        		self.debug.log("Baseline - t1: " + t1);
        		
        		averageThrough = self.metricsBaselineExt.getAverageThrough(t1, metricsBaseline.ThroughSeg, startRequest);	
	            	
	        	if (isNaN(averageThrough) || averageThrough == 0 || averageThrough==undefined || averageThrough == null) {
	                     self.debug.log("The averageThrough is NaN, bailing.");
	             		 self.metricsBaselinesModel.setBdelay(bDelay);
	                     deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
	            }else{
	            	
	        		self.debug.log("Baseline - averageThrough: " + averageThrough + "bit/ms");

	         			self.debug.log("Começa a regra");

	                	 if(current != max){
	             			representation2 = self.manifestExt.getRepresentationFor1(current + 1, data);
	                 		oneUpBandwidth = self.manifestExt.getBandwidth1(representation2);
	                 		oneUpBandwidth /= 1000;
	             		}
	                	 
	                	 if(runningFastStart &&
	                			 current != max &&
	                			 self.metricsBaselineExt.getBufferMin(deltaBuffer, metrics) &&													//para todo t1<t2<=t *
	                             currentBandwidthMs <= ALPHA_1 * averageThrough){ 
	                          	
	               			self.debug.log("runningFastStart true");
	                     	
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
	                  		 self.metricsBaselinesModel.setBdelay(bDelay);
	                         deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
	                       }else{
	                		   self.debug.log("runningFastStart false");
	                    	   runningFastStart = false;
	                    	                          	   
	                           if(currentBufferLevel.level < bMin && current >= 0){
	                                self.debug.log("Down MIN");
	                                self.metricsBaselinesModel.setBdelay(bDelay);
	 	                           	deferred.resolve(new MediaPlayer.rules.SwitchRequest(0)); 
	                           }else if(currentBufferLevel.level < bLow){
	                                if(current != 0 && currentBandwidth >= currentThrough){
	                                      self.debug.log("Down One");
	                                      self.metricsBaselinesModel.setBdelay(bDelay);
	       	                              deferred.resolve(new MediaPlayer.rules.SwitchRequest(current - 1)); 
	                                }else{
                                      	self.debug.log("Nao troca");
                                        self.metricsBaselinesModel.setBdelay(bDelay);
         	                           deferred.resolve(new MediaPlayer.rules.SwitchRequest(current)); 
	                                }
	                           }else if(currentBufferLevel.level < bHigh){
	                        		 if(current == max || oneUpBandwidth >= ALPHA_5 * averageThrough){
	                                        self.debug.log("Apply delay 2");
	                                        bDelay = Math.max(currentBufferLevel.level - lastRequest.mediaduration, bOpt);
	                                        self.metricsBaselinesModel.setBdelay(bDelay);
	         	                           deferred.resolve(new MediaPlayer.rules.SwitchRequest(current)); 
	                        		 }else{
	                                      	self.debug.log("Nao troca");
	                                       self.metricsBaselinesModel.setBdelay(bDelay);
	         	                           deferred.resolve(new MediaPlayer.rules.SwitchRequest(current)); 
	                        		 }
	                        		 
	                           }else{
	                        		 if(current == max || oneUpBandwidth >= ALPHA_5 * averageThrough){
	                                       self.debug.log("Apply delay 3");
	                                       bDelay = Math.max(currentBufferLevel.level - lastRequest.mediaduration, bOpt);
	                                       self.metricsBaselinesModel.setBdelay(bDelay);
	        	                           deferred.resolve(new MediaPlayer.rules.SwitchRequest(current)); 
	                                 }else{
	                                     	self.debug.log("Up One");
	             							current += 1;
	             							self.metricsBaselinesModel.setBdelay(bDelay);
	         	                           deferred.resolve(new MediaPlayer.rules.SwitchRequest(current)); 
	                        		 }
	                           }
	                           self.debug.log("Current: " + current);
	                           self.debug.log("bDelay: " + bDelay);
	                        }
	                }
			   		 	
        		 	return deferred.promise;
       	}
       };
    };

MediaPlayer.rules.MillerRule.prototype = {
    constructor: MediaPlayer.rules.MillerRule
};