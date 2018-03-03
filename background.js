// 配置zip库文件的路径
zip.workerScriptsPath = "lib/";

// 定义发送和接受的消息内容
var MESSAGE = {
    START: "start",
    INIT_OK: "init_ok",
    NEXT: "next",
    OK: "ok",
    END: "end"
};

var needPrintTab; // 要打印的tab

// 图片分页的高度
// var SEPARATE_HEIGHT = 1200; // 全屏显示图片时 kindle dx的高度
var SEPARATE_HEIGHT = 1159; // 非全屏显示图片时(带有状态栏) kindle dx的高度


// 点击图标 inject脚本到当前激活的tab中
chrome.browserAction.onClicked.addListener(function(tab) {
    needPrintTab = tab;
    // 在要截图的页面（简称page）上执行指定文件中的脚本
    //    在page中注册一个监听器，接受这边发过去的指令（翻页指令等）
    chrome.tabs.executeScript(
        needPrintTab.id, // defaults to the active tab of the current window
        { file: 'execute_in_page.js' },
        function(result) {

            // 在page中注册好监听器后 开始给page发送scrool信息 并进行截屏
            // @todo  添加 设计照片到readME中
            send_message(MESSAGE.START);
        }
    );
});

function send_message(message) {

    // 向要打印的页面发送信息，那边处理完后会回调函数
    chrome.tabs.sendMessage(needPrintTab.id, { message: message }, function(response) {
        switch (response.message) {
            case MESSAGE.INIT_OK:
                // 初始化canvas宽度和高度
                init_canvas(response.width, response.totalHeight);
                capture_screen(0, function() {
                    send_message(MESSAGE.NEXT);
                });
                break;
            case MESSAGE.OK:
                capture_screen(response.y, function() {
                    send_message(MESSAGE.NEXT);
                });
                break;
            case MESSAGE.END:
                capture_end();
                break;
            default:
                console.error("未知信息类型！");
        }
    });
}

/////
///  截取屏幕的可见部分放到 canvas 中坐标为y的地方
//
function capture_screen(y, callBackGoOn) {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, function(dataUrl) {
        // $("#shower").src = dataUrl;
        var canvas = $('#canvas');

        var canvas_context = canvas.getContext('2d');

        var image = new Image();
        image.src = dataUrl;
        image.onload = function() {
            canvas_context.drawImage(image, 0, y);
            callBackGoOn();
        }
    });
}

function init_canvas(width, height) {
    var canvas = $('#canvas');
    canvas.width = width;
    canvas.height = height;
}


// 添加页码
function addPageNumToCanvas() {

    // 页码距离底部的高度
    var lableDistanceToBottom = 20;

    // var canvas = $('#canvas');
    // var ctx = canvas.getContext("2d");

    // var h = canvas.height;
    // var w = canvas.width;

    // // 分割成每张高度为SEPARATE_HEIGHT的图片
    // var images = [];
    // for (var y = 0; y < h; y += SEPARATE_HEIGHT) {
    //     images.push(ctx.getImageData(0, y, w, Math.min(h - y, SEPARATE_HEIGHT)));
    // }
}
/////
///  截屏结束 将canvas的内容写入图片文件，在新的tab中打开
//
function capture_end() {
    addPageNumToCanvas();

    // capture_end_into_one_png();  //写进一张图片中
    // capture_end_into_multi_png();  //写进多张图片中，每张图片的高度为SEPARATE_HEIGHT
    capture_end_into_zip(); // 将多张图片写入到一个zip文件中
}
// 写入单图片文件
function capture_end_into_one_png() {
    var canvas = $('#canvas');

    // canvas 中的图像数据
    var dataURI = canvas.toDataURL();

    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs
    var byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // create a blob for writing to a file
    var blob = new Blob([ab], { type: mimeString });



    var filename = "bfy.png";

    // come up with file-system size with a little buffer
    var size = blob.size + (1024 / 2);

    // create a blob for writing to a file
    var reqFileSystem = window.webkitRequestFileSystem;
    reqFileSystem(window.TEMPORARY, size, function(fs) {
        fs.root.getFile(filename, { create: true }, function(fileEntry) {
            fileEntry.createWriter(function(fileWriter) {
                fileWriter.onwriteend = onwriteend;
                fileWriter.write(blob);
            });
        });
    });

    function onwriteend() {
        // open the file that now contains the blob - calling
        // `openPage` again if we had to split up the image
        var urlName = ('filesystem:chrome-extension://' +
            chrome.i18n.getMessage('@@extension_id') +
            '/temporary/' + filename);

        chrome.downloads.download({
            url: urlName,
            saveAs: false
        }, function() {
            console.log("download OK.");
        });
    }
}
// 写入多图片文件
function capture_end_into_multi_png() {

    var canvas = $('#canvas');
    var ctx = canvas.getContext("2d");

    var h = canvas.height;
    var w = canvas.width;

    // 分割成每张高度为SEPARATE_HEIGHT的图片
    var images = [];
    for (var y = 0; y < h; y += SEPARATE_HEIGHT) {
        images.push(ctx.getImageData(0, y, w, Math.min(h - y, SEPARATE_HEIGHT)));
    }


    // 写入文件中，在新tab中打开
    for (var i in images) {
        writeToFile(images[i], "BFYImage" + i + ".png");
    }


    function writeToFile(img, fileName) {

        // 把图片数据画到canvas中然后取出png格式的图片数据
        var canvas = document.createElement('canvas')
        canvas.width = img.width;
        canvas.height = img.height;

        var ctx = canvas.getContext("2d");
        ctx.putImageData(img, 0, 0); // 画上

        // 取出png格式的数据
        var dataURI = canvas.toDataURL();

        // convert base64 to raw binary data held in a string
        // doesn't handle URLEncoded DataURIs
        var byteString = atob(dataURI.split(',')[1]);

        // separate out the mime component
        var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

        // write the bytes of the string to an ArrayBuffer
        var ab = new ArrayBuffer(byteString.length);
        var ia = new Uint8Array(ab);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        // create a blob for writing to a file
        var blob = new Blob([ab], { type: mimeString });

        // 写图片文件 然后在新tab页中打开
        window.webkitRequestFileSystem(
            window.TEMPORARY,
            blob.size,
            function(fs) {
                fs.root.getFile(fileName, { create: true }, function(fileEntry) {
                    fileEntry.createWriter(function(fileWriter) {
                        fileWriter.onwriteend = function() {
                            var urlName = ('filesystem:chrome-extension://' +
                                chrome.i18n.getMessage('@@extension_id') +
                                '/temporary/' + fileName);

                            chrome.downloads.download({
                                url: urlName,
                                saveAs: false
                            }, function() {
                                console.log("download OK.");
                            });

                            // chrome.tabs.create({url: urlName,active: true});
                        };
                        fileWriter.write(blob);
                    });
                });
            }
        );
    }

    return;
}
// 写入zip文件
function capture_end_into_zip() {

    var canvas = $('#canvas');
    var ctx = canvas.getContext("2d");

    var h = canvas.height;
    var w = canvas.width;

    // 分割成每张高度为SEPARATE_HEIGHT的图片
    var images = [];
    for (var y = 0; y < h; y += SEPARATE_HEIGHT) {
        images.push(ctx.getImageData(0, y, w, Math.min(h - y, SEPARATE_HEIGHT)));
    }

    // 写入zip文件中
    writeToZipFile(images);
}

function writeToZipFile(images) {
    var zipWriter;

    initZip(addImagesToZip);

    function initZip(initOK) {
        zip.createWriter(new zip.BlobWriter(), function(writer) {
            zipWriter = writer;
            initOK();
        });
    }

    function addImagesToZip() {

        var i = 0;

        nextFile();

        function nextFile() {
            var imgBlob = getImgBLob(images[i]);
            var fileName = "BFYImage" + (i).padLeft(2, '') + ".png";
            zipWriter.add(fileName, new zip.BlobReader(imgBlob), function() {
                l(i);
                ++i;
                if (i < images.length)
                    nextFile();
                else
                    downLoadZip();
            });
        }
    }

    function downLoadZip() {
        zipWriter.close(function(blob) {
            var blobURL = window.URL.createObjectURL(blob);
            zipWriter = null;
            var zipName = needPrintTab.title.replace(/[^\.\sa-z0-9]/gi, "")
            chrome.downloads.download({
                filename: "BFY[" + zipName + "].zip",
                url: blobURL,
                saveAs: false
            });
        });
    }
}

function getImgBLob(img) {
    // 把图片数据画到canvas中然后取出png格式的图片数据
    var canvas = document.createElement('canvas')
    canvas.width = img.width;
    canvas.height = img.height;

    var ctx = canvas.getContext("2d");
    ctx.putImageData(img, 0, 0); // 画上

    // 取出png格式的数据
    var dataURI = canvas.toDataURL();

    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs
    var byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // create a blob for writing to a file
    var blob = new Blob([ab], { type: mimeString });
    return blob;
}

function $(s) { return document.querySelector(s); }
/*
 *  左边填充0
 *  1->01  2->02
 */
Number.prototype.padLeft = function(n, str) {
    return Array(n - String(this).length + 1).join(str || '0') + this;
};

//////////////////  DEBUG  ///////////////////
function l(s) {
    console.log(s);
}
//////////////////////////////////////////////