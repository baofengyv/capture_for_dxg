/**
 * 在要截图的界面上执行
 *   控制滚动到指定的区域
 */

////////////////////////// 写在前面 //////////////////////////
// 关于显示尺寸（display_size）和内容尺寸（content_size）的解释
//   显示尺寸是指：元素在显示器上占据的像素尺寸.
//   内容尺寸是指：元素在浏览器中的尺寸属性值。
// 例如：
//    一个div的CSS尺寸为13×13px,缩放到200%后div在显示器上占据的尺寸为26×26px，
//    但div的CSS属性仍然为13×13px。
/////////////////////////////////////////////////////////////////

// 隐藏滚动条，这样计算的高度才对
document.documentElement.style.overflow = 'hidden';

//窗口的实际显示宽度
var window_content_height = window.innerHeight;
var window_display_width = window.innerWidth * window.devicePixelRatio;

// 内容的总高度（！缩放会影响显示的尺寸但内容的尺寸并不会变）
var total_content_height = document.documentElement.scrollHeight;
console.log("total_content_height:" + total_content_height);
//页面的实际显示总高度
var total_display_height = total_content_height * window.devicePixelRatio;

var y = 0; //页面的 y positon
var previous_y = 0;

var SCROLL_DELAY = 1000;

if (typeof FLAG_FOR_EXECUTE_ONCE == 'undefined') {

    // 定义一个flag使这里面只执行一次
    var FLAG_FOR_EXECUTE_ONCE = true;

    // 定义发送和接受的消息内容
    var MESSAGE = {
        START: "start",
        INIT_OK: "init_ok",
        NEXT: "next",
        OK: "ok",
        END: "end"
    };

    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {

        switch (message.message) {
            case MESSAGE.START:

                scrool_to_start(); // 滚动到开头部分

                afterDelay(sendResponse, {
                    message: MESSAGE.INIT_OK,
                    width: window_display_width,
                    totalHeight: total_display_height
                });
                break;
            case MESSAGE.NEXT:
                // 如果能往下滚动 回复OK
                if (scrool_to_next()) {
                    afterDelay(sendResponse, {
                        message: MESSAGE.OK,
                        y: y * window.devicePixelRatio
                    })
                } else {
                    // 如果已经滚动到底部了 回复END
                    sendResponse({
                        message: MESSAGE.END
                    });
                    showAllScrollBar(); // 显示隐藏掉的滚动条
                }
                break;
            default:
                console.error("未知信息类型！");
        }

        // 根据文档 如果这里不返回true的话 sendResponse 将会被自动调用
        // 如果这里返回true 则可以异步调用sendResponse
        return true;
    });

    // 滚动到屏幕最上方
    function scrool_to_start() {
        y = 0;
        window.scrollTo(window.scrollX, y);
    }

    function scrool_to_next() {
        l("------------------------------");
        l("y:" + y);

        l("y+window_content_height:" + (y + window_content_height));
        l("total_content_height" + total_content_height);

        // 已经滚动到底部了，没法再滚动了 返回false
        if (total_content_height - y - window_content_height < 1)
        // 关于这里的“1”的解释：
        //   有时y + window_content_height 与 total_content_height的差距为零点几
        //   导致不断的翻页
            return false;

        // 滚动到下一个位置 然后，更新y坐标值
        l("try scroll_to:" + (y + window_content_height));

        window.scrollTo(window.scrollX, y + window_content_height);
        y = window.scrollY;

        // 如果滚动后y的值不变了，表示滚到底啦
        if (y == previous_y)
            return false;

        l("after scroll y:" + y);
        l("previous_y:" + previous_y);
        l("------------------------------");

        previous_y = y;
        return true;
    }

    function afterDelay(sendResponse, x) {
        window.setTimeout(function() {
            sendResponse(x);
        }, SCROLL_DELAY);
    }

    function showAllScrollBar() {
        document.documentElement.style.overflow = '';
    }
    ////////// DEBUG ////////////
    function l(s) {
        console.log(s);
    }
    /////////////////////////////
}