/* Baseline implementations by Maiara on 2013-10-29
 * 
 */
Dash.dependencies.DashMetricsBaselineExtensions = function () {
    "use strict";
    
    var min = function(values) {

        if(values.length == 0) {

            return NaN;
        } else if(values.length == 1) {
            var val = values.pop();
            if ( typeof val == "number" ) {
                return val;
            } else {
                return NaN;
            }
        } else {
            var val = values.pop();
            return Math.min(val, this.min(values))
        }
    },
    
    getBufferMinTime = function (timeTarget, deltaBuffer, metrics, startRequestTime) {
   	 	var bufferList = metrics.BufferLevel, 
   	 		bufferMinArrayTemp = [],
   	 		startTime, 
   	 		finishTime, 
   	 		startTimeTemp, 
   	 		finishTimeTemp, 
   	 		begin = 0, 
   	 		end = bufferList.length, 
   	 		bufferTime;
	 
   	 	startTimeTemp = (timeTarget/deltaBuffer) * deltaBuffer;
   	 	finishTimeTemp = startTimeTemp + deltaBuffer;
   	 	startTime = Math.floor(startTimeTemp);
   	 	finishTime = Math.floor(finishTimeTemp);
   	 
   	 	this.debug.log("Baseline - timeTarget: " + timeTarget+" ms");
    	this.debug.log("Baseline - startTime: "+ startTime);
    	this.debug.log("Baseline - finishTime: "+ finishTime);
   	 	
	 	while(begin < end){
	 		bufferTime = bufferList[begin].t.getTime() - startRequestTime;
	    	this.debug.log("Baseline - bufferTime: "+ bufferTime);
	 		
	 		if (bufferTime >= startTime && bufferTime <= finishTime){
	 			bufferMinArrayTemp.push(bufferList[begin].level);
	 		}
	 		begin++;
	 	} 
    	this.debug.log("bufferMinArrayTemp: "+ bufferMinArrayTemp.length);

	 	return this.min(bufferMinArrayTemp);
    },
    
    /*
    getBufferMinTeenTime = function (numSegs, metricsBaseline) {
        if (metricsBaseline == null) {
            return [];
        }
        
        var bufferLevelList = metricsBaseline.BufferLevel,
        	bufferLevelListLength,
        	bufferLevelListIndex,
        	bufferLevelListTemp,
        	bufferMinArrayTemp = [],
        	startTime, 
   	 		finishTime, 
   	 		startTimeTemp, 
   	 		finishTimeTemp, 
   	 		begin = 0, 
   	 		end = bufferList.length, 
   	 		bufferTime;
    
        if (bufferLevelList == null || bufferLevelList.length <= 0) {
            return [];
        }

        bufferLevelListLength = bufferLevelList.length;
        bufferLevelListIndex = bufferLevelListLength - 1;

        while (bufferLevelListIndex >= bufferLevelListLength - numSegs) {
        	bufferLevelListTemp.push(bufferLevelList[bufferLevelListIndex].bufferLevel);
        	bufferLevelListIndex -= 1;
        }
        
        startTimeTemp = (timeTarget/deltaBuffer) * deltaBuffer;
   	 	finishTimeTemp = startTimeTemp + deltaBuffer;
   	 	startTime = Math.floor(startTimeTemp);
   	 	finishTime = Math.floor(finishTimeTemp);
		
   	 	while(begin < end){

	 		bufferTime = bufferList[begin].t.getTime() - startRequestTime;
	 		if (bufferTime >= startTime && bufferTime <= finishTime){
	 			bufferMinArrayTemp.push(bufferList[begin].level);
	 		}
	 		begin++;
	 	} 
   	 	this.debug.log("bufferMinArrayTemp: "+ bufferMinArrayTemp.length);

	 	return this.min(bufferMinArrayTemp);
    }, 
    */
    
    getAverageThrough = function (time1, time, metricsBaseline, startSessionTime) {
    	var throughList = metricsBaseline.ThroughSeg,
    	begin = 0, 
    	end = throughList.length,
    	intersection, 
 		throughInters, 
 		somaInters = 0, 
 		somaThroughInters = 0, 
 		countSegs = 0,
 		startTime, 
 		finishTime;

    	//this.debug.log("Baseline - T1: " + time1+" ms");

    	while(begin < end){
    		startTime = throughList[begin].responseTime.getTime() - startSessionTime; 
    		finishTime = throughList[begin].finishTime.getTime() - startSessionTime;
    		
	    	//this.debug.log("Baseline - throughSeg: "+ throughList[begin].throughSeg);

    		if(finishTime >= time1){
    			if (startTime < time1) starTime = time1;

    			intersection = finishTime - startTime;

    			throughInters = throughList[begin].throughSeg * intersection;

    			somaInters += intersection;

    			somaThroughInters += throughInters;
    	    	
    			//this.debug.log("Baseline - intersection: "+ intersection);
    	    	//this.debug.log("Baseline - throughInters: "+ throughInters);
    	    	//this.debug.log("Baseline - somaInters: "+ somaInters);
    	    	//this.debug.log("Baseline - somaThroughInters: "+ somaThroughInters);

    			countSegs++;
    		}
    		
    		begin++;
    	}
    	
    	this.debug.log("Baseline - Segments number: "+ countSegs);

    	return (somaThroughInters/somaInters);
        
    },
        
    getThroughSegs = function (metricsBaseline) {
        if (metricsBaseline == null) {
            return [];
        }

        return !metricsBaseline.ThroughSeg ? metricsBaseline.ThroughSeg : [];
    },
    
    getDelays = function (metricsBaseline) {
        if (metricsBaseline == null) {
            return [];
        }

        return !metricsBaseline.Delay ? metricsBaseline.Delay : [];
    },
    
    getLastDelay = function (metricsBaseline) { //informacoes da ultima transação http respondida, ou seja de n(t)

        if (metricsBaseline === null) {
            return null;
        }

        var delayList = metricsBaseline.Delay,
        	delayListLength,
        	delayListLastIndex,
            currentDelayList = null;
        
        if (delayList === null || delayList.length <= 0) {
            return null;
        }

        delayListLength = delayList.length -1;
        currentDelayList = delayList[delayListLastIndex];
        
        return currentDelayList;
    };

    return {
    	debug : undefined,
    	min : min,
    	getBufferMinTime : getBufferMinTime,
    	getAverageThrough : getAverageThrough,
    	getDelays : getDelays,
    	getLastDelay : getLastDelay
    };
};

Dash.dependencies.DashMetricsBaselineExtensions.prototype = {
    constructor: Dash.dependencies.DashMetricsBaselineExtensions
};
