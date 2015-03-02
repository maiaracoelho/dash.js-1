/* Baseline implementations by Maiara on 2013-10-29
 * 
 */
Dash.dependencies.DashMetricsBaselineExtensions = function () {
    "use strict";
    
    var getMin = function (timeTarget, deltaBuffer, bufferList) {

   	 	var bufferMinArrayTemp = [],
   	 		startTime, 
   	 		finishTime,
   	 		min;
   	 	
   	 	startTime = timeTarget;
   	 	finishTime = timeTarget + deltaBuffer;
   	 
   	 	//this.debug.log("Baseline - timeTarget: " + timeTarget);
    	//this.debug.log("Baseline - startTime: "+ startTime);
    	//this.debug.log("Baseline - finishTime: "+ finishTime);
   	 	min = bufferList[startTime].level;
   	 	
    	while(startTime < finishTime){
    		if(bufferList[startTime].level < min){
    			min = bufferList[startTime].level;
    		}
	 		startTime++;
	 	} 

	 	return min;
    },
    
    getBufferMin = function (deltaBuffer, metrics) {
   	 	var bufferList = metrics.BufferLevel, i, incremental = true, min1, min2;
   	 	   	 	
	 	for(i = 0; i < bufferList.length - deltaBuffer; i+=deltaBuffer){
	    	
	 		min1 = this.getMin(i, deltaBuffer, bufferList);
	    	min2 = this.getMin(i + deltaBuffer, deltaBuffer, bufferList);
	 		
	    	if (min1 > min2){

	 			incremental = false;
	 		}
	 	} 

	 	return incremental;
    },
    
   getAverageThrough = function (time1, throughList, startSessionTime) {
    	var begin, 
    	end = throughList.length - 1,
    	intersection, 
 		throughInters, 
 		somaInters = 0, 
 		somaThroughInters = 0, 
 		countSegs = 0,
 		startTime, 
 		startTimeTemp, 
 		finishTime;

    	for(begin = 0; begin <= end; begin++){
    		startTime = throughList[begin].responseTime.getTime() - startSessionTime; 
    		finishTime = throughList[begin].finishTime.getTime() - startSessionTime;
    		
    		if(finishTime > time1){
    			if (startTime < time1){
    				startTimeTemp = time1;
    			}else{
    				startTimeTemp = startTime;
    			}
    			intersection = finishTime - startTimeTemp;
    			throughInters = throughList[begin].throughSeg * intersection;
    			
    			somaInters += intersection;
    			somaThroughInters += throughInters;
    	    	
    			countSegs++;
    		}
    	}
    	
    	this.debug.log("Baseline - Segments number: "+ countSegs);

    	return (somaThroughInters/somaInters);
        
    },
    
    getAverageAllThroughs = function (throughList) {
    	var begin, 
    	end = throughList.length - 1,
 		sumThroughs = 0;

    	for(begin = 0; begin <= end; begin++){
    		sumThroughs += throughList[begin].throughSeg;
    	}
    	
    	return (sumThroughs/throughList.length);
        
    },
        
    getThroughSegs = function (metricsBaseline) {
        if (metricsBaseline == null) {
            return [];
        }

        return !metricsBaseline.ThroughSeg ? metricsBaseline.ThroughSeg : [];
    };

    return {
    	debug : undefined,
    	getMin : getMin,
    	getBufferMin : getBufferMin,
    	getAverageThrough : getAverageThrough,
    	getAverageAllThroughs : getAverageAllThroughs,
    	getThroughSegs : getThroughSegs
    };
};

Dash.dependencies.DashMetricsBaselineExtensions.prototype = {
    constructor: Dash.dependencies.DashMetricsBaselineExtensions
};
