/** Algoritmo que considera características do buffer, implementado a partir do artigo TR5
 * 	@class MillerRule
 */
MediaPlayer.rules.MillerRule = function () {
    "use strict";
    
        var runningFastStart=true,
        	deltaTime=15000, 
        	        	      
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
        				
        				through = (throughList[i].sizeSeg)/downloadTime; 

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
                firstRequest = self.metricsExt.getFirstHttpRequest(metrics), 											
                currentBufferLevel  = self.metricsExt.getCurrentBufferLevel(metrics),					
                bMin=10,
                bLow=20,
                bHigh=30,														
                downloadTime,															
                currentThrough,																					
                time = 0, 
                t1 = 0,
                deferred,    
                sigma = 0.8,
            	slackC = 0.8,
                currentBandwidth,
                bandwidth,
                max,
                representation,
                representation1,
                startRequest = 0,
                averageThrough,
                currentBandwidthMs = 0,
                sizeSeg,
                perfil1,
                perfil2;
                
            	self.debug.log("Baseline - Regra TR5 MillerRule");
             	self.debug.log("Baseline - Tamanho BufferLevel: " + metrics.BufferLevel.length);
             	self.debug.log("Baseline - Tamanho Through: " + metricsBaseline.ThroughSeg.length);
             	
                if (!metrics) {
                	//self.debug.log("No metrics, bailing.");
                	return Q.when(new MediaPlayer.rules.SwitchRequest(current));
                }
                
                if (!metricsBaseline) {
                	//self.debug.log("No metrics Baseline, bailing.");
                	return Q.when(new MediaPlayer.rules.SwitchRequest(current));
                }
                         
                if (currentBufferLevel == null) {
                    //self.debug.log("No currentBufferLevel made for this stream yet, bailing.");
                    return Q.when(new MediaPlayer.rules.SwitchRequest(current));
                }
                
                if (lastRequest == null) {
                    //self.debug.log("No lastRequest made for this stream yet, bailing.");
                    return Q.when(new MediaPlayer.rules.SwitchRequest(current));
                }

                if (firstRequest == null) {
                    //self.debug.log("No firstRequest made for this stream yet, bailing.");
                    return Q.when(new MediaPlayer.rules.SwitchRequest(current));
                }
                
            	insertThroughputs.call(self, metricsBaseline.ThroughSeg, availableRepresentations);
                
            	if (lastRequest.stream == "audio"){
					self.debug.log("Audio - Nao Avalia.");
		            return Q.when(new MediaPlayer.rules.SwitchRequest(current));
            	}
            	
             	deferred = Q.defer();

                //O início da sessão como um todo so acontece a partir do momento em que a primeira requisição de mídia é feita.
             	startRequest = firstRequest.trequest.getTime(); 
            	time = lastRequest.tfinish.getTime() - startRequest;
            	
            	if (time >= deltaTime){
            		t1 = time - deltaTime;
                }
            	
                sizeSeg = (lastRequest.trace[lastRequest.trace.length - 1].b) * 8;
            	downloadTime = (lastRequest.tfinish.getTime() - lastRequest.tresponse.getTime())/1000;
            	max = self.manifestExt.getRepresentationCount1(data);
            	max -= 1;
            	representation = self.manifestExt.getRepresentationFor1(current, data);
            	currentBandwidth = self.manifestExt.getBandwidth1(representation);
            	currentBandwidthMs = currentBandwidth/1000;
            	currentThrough = sizeSeg/downloadTime; 	
            	currentThrough /= 1000; 	
        		
				self.debug.log("Baseline - time: " + time);
        		self.debug.log("Baseline - t1: " + t1);
        		self.debug.log("Baseline - currentBufferLevel.level: " + currentBufferLevel.level + " s");
        		self.debug.log("Baseline - currentBandwidth: " + currentBandwidth + " bits/s");
        		self.debug.log("Baseline - currentThrough: " + currentThrough + " bits/s");

        		if(metricsBaseline.ThroughSeg.length == 1){
            		averageThrough = currentThrough;	
        		}else{
            		averageThrough = self.metricsBaselineExt.getAverageThrough(t1, metricsBaseline.ThroughSeg, startRequest);	
        		} 
        		self.debug.log("Baseline - averageThrough: " + averageThrough + " bits/ms");
	
	        	if (isNaN(averageThrough)) {
	                     //self.debug.log("The averageThrough is NaN, bailing.");
	             		 self.metricsBaselinesModel.setBdelay(bDelay);
	                     deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));
	            }else{
	            	perfil1 =  current;
	            	perfil2 =  current;
	            	
	            	for (var i = 0; i < availableRepresentations.length; i++){
	            		representation1 = availableRepresentations[i];
	    				bandwidth = self.metricsExt.getBandwidthForRepresentation(representation1.id);
	    				
	    				if ((bandwidth/1000) < (slackC * averageThrough)){
	    					perfil1 =  representation1.id;
	    				}
	    				
	    				if (bandwidth < (slackC * currentThrough)){
	    					perfil2 =  representation1.id;
	    				}
	    				
	            	}
	            	self.debug.log("Baseline - perfil1: " + perfil1);
    				self.debug.log("Baseline - perfil2: " + perfil2);
	            	
	            	if(bLow < currentBufferLevel.level && currentBufferLevel.level <  bHigh){
	            		if(perfil2 > current){
	            			current++;
	            		}
					}else if (bMin < currentBufferLevel.level && currentBufferLevel.level <  bLow){
	            		if(perfil1 < current){
	            			current--;
	            		}else if (perfil1 > current){
	            			currrent++;
	            		}
	            	}else if (currentBufferLevel.level < bMin){
	            		current = 0;
	            	}

	            	self.debug.log("Baseline - Current: " + current);
                    deferred.resolve(new MediaPlayer.rules.SwitchRequest(current));	
	            }
	        	 return deferred.promise;	 
       	}
       };
    };

MediaPlayer.rules.MillerRule.prototype = {
    constructor: MediaPlayer.rules.MillerRule
};