// The MIT License (MIT)

// Copyright (c) 2014 Joey Dehnert

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

(function($){

	Gboy = {

		cid: null,
		imageContext: null,
		videoContext: null,
		video: null,
		stop: false,
		shareUrl: null,
		init: function(){

			if (Gboy.checkSupport()) {
				Gboy.startVideo();
				Gboy.cid();
			} else {
				alert('getUserMedia() is not supported in your browser. Please use Chrome.');
			}


		},
		cid: function(){

			$.ajax({
				url: 'cid.php',
				success: function(data){
					Gboy.cid = data;
				},
				error: function(e){
					console.log("Ajax error: ", e);
				}
			});


		},
		checkSupport: function(){

			  return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
			            navigator.mozGetUserMedia || navigator.msGetUserMedia);

		},
		getCanvas: function(){

			var gboyImageCanvas = document.getElementById("gboy-image"),
 				gboyImageContext = gboyImageCanvas.getContext("2d"),
 				gboyVideoCanvas = document.getElementById("gboy-screen"),
 				gboyVideoContext = gboyVideoCanvas.getContext("2d");

 			Gboy.imageContext = gboyImageContext;
 			Gboy.videoContext = gboyVideoContext;

		},
		startVideo: function(){		

			navigator.getUserMedia  = navigator.getUserMedia ||
                          navigator.webkitGetUserMedia ||
                          navigator.mozGetUserMedia ||
                          navigator.msGetUserMedia;

			Gboy.video = document.querySelector('video');

			navigator.getUserMedia({video: true}, function(stream) {
			 	
			 	Gboy.video.src = window.URL.createObjectURL(stream);
				localMediaStream = stream;

				Gboy.getCanvas();

				Gboy.drawVideo(Gboy.video);				

				$(".btn-take").click(function(){
					Gboy.stopVideo();
				});

				$(".btn-restart").click(function(){
					Gboy.restartVideo();
				});

			});

		},
		drawVideo: function(video){

			if (Gboy.stop) {
		    	return;
		    }
			
			Gboy.videoContext.drawImage(video,0,0,640,480);
			Gboy.manipulateImage($("#gboy-screen"), Gboy.videoContext);

			setTimeout(function(){
				Gboy.drawVideo(video);				
			},0);

		},
		stopVideo: function(){

			Gboy.stop = true;
			Gboy.addImage();

		},
		restartVideo: function(){

			Gboy.stop = false;
			Gboy.drawVideo(Gboy.video);

		},
		addImage: function(){

			var image = new Image(),
				photo = new Image(),
				outputImage = new Image(),
				videoCanvas = document.getElementById('gboy-screen'),
				imageCanvas = document.getElementById('gboy-image');

			image.src = "images/gboy-screencap.jpg";
			photo.src = videoCanvas.toDataURL('image/png');

			image.onload = function() {
			
				Gboy.imageContext.drawImage(image, 0, 0);
				Gboy.imageContext.drawImage(photo, 83, 0, 473, 431, 158, 192, 473, 431);

				outputImage.src = imageCanvas.toDataURL('image/png');

				outputImage.onload = function() {

					$("#gboy-container").append(outputImage);
					$(outputImage).hide();

					$("#social-container").css("display", "block");
					
					$(".btn-tweet").click(function(){
						Gboy.imgUpload(outputImage, $(this).attr("data-network"));
					});

					$(".btn-fb").on("click", function(){
						Gboy.imgUpload(outputImage, $(this).attr("data-network"));
					});

					$(".btn-imgur").on("click", function(){
						Gboy.imgUpload(outputImage);
					});
					
				}

			};

		},
		manipulateImage: function(canvas, context){

			var canvasSelector = canvas,
				imageData = context.getImageData(0, 0, canvasSelector.width(), canvasSelector.height()),
				pixels = imageData.data,
				pixelCount = imageData.data.length;
				colorPalette = [[15,56,15],[48,98,48],[139,172,15],[155,188,15]],
				greenValues = [56,98,172,188];

			// it's faster to process the pixelCount ahead of time than to take the length of the pixels array.
			for (var i = 0; i < pixelCount; i+=4) {

				var valueIndex = 0,
					closestValue = 1000000,
					tempValue;

				for(var j = 0; j < greenValues.length; j++){

					tempValue = Math.abs(greenValues[j] - pixels[i+1]);

					// console.log(j, tempValue, closestValue);

					if(tempValue < closestValue){

						closestValue = tempValue;
						valueIndex = j;

					}

				}

			    pixels[i] = colorPalette[valueIndex][0]; // Red
			    pixels[i+1] = colorPalette[valueIndex][1]; // Green
			    pixels[i+2] = colorPalette[valueIndex][2]; // Blue
			
			};

			context.putImageData(imageData, 0, 0);
		
		},
		imgUpload: function(image, network){

			var imgUrl = null,
				imgSrc = image.src,
				imgBase64 = imgSrc.replace("data:image/png;base64,", "");

			$("#processing-container").show();

			$.ajax({
				url: 'https://api.imgur.com/3/image',
	      		method: 'POST',
				headers: {
			        Authorization: "Client-ID " + Gboy.cid
		      	},
				data: {
					image: imgBase64,
					type: "base64"
				},
				success: function(images){

					Gboy.shareUrl = images.data.link;

					if(network === "facebook"){
						Gboy.shareFB();
					} else if (network === "twitter"){
						Gboy.shareTweet();
					}

					$("#processing-container").html("Your image link: <a href='" + images.data.link + "' target='_blank'>" + images.data.link + "</a>");

				},
				error: function(e){
					console.log("Ajax error: ", e);
				}
			});

		},
		shareFB: function(){

			window.open("https://www.facebook.com/sharer/sharer.php?u=" + Gboy.shareUrl, "_blank");

		},
		shareTweet: function(){

			var text = escape("I just gameboy camera-fied myself. Try it yourself: http://joeydehnert.com/gboy-cam/");

			window.open("https://twitter.com/share?url=" + Gboy.shareUrl + "&text=" + text, "_blank");

		}

	}; Gboy.init();

})(jQuery);