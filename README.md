# American Flag in Place - r/place Bot
 
Bot for PlaceNL! Automatically loads instructions from control server.
 
 
## Installation
 
Before installing make sure that pixel countdown is gone and that you can place a pixel
 
1. Install this browser extenstion [Tampermonkey](https://www.tampermonkey.net/)
2. Click on [this link](./tampermonkey/placenlbot.user.js?raw=1). If everithing goes well, Tampermonkey schoul offer installation of user script. Click on **Install**.
3. Open or Reload page **r/place**. If everithing went well, iun top-right corner will appear "Fetching token...“. Robot is now active and it will inform you about what it is doing.
 
 
 
https://user-images.githubusercontent.com/35738060/161389444-fe58ebf5-9527-4c8c-94d0-1e17896ce835.mp4
 
 
 
## Bot Drawbacks
 
When the bot places a pixel, it may still seem like you can place a pixel even though the bot has already done it for you (so you are in a 5-minute cooldown). The bot currently does not consider the ongoing cooldown, so it assumes that when you open r/place, it can immediately place a pixel. In the worst case, your first pixel may be placed in the next cycle after 4 minutes and 59 seconds.
 
 
 
## Getting token
 
### Using Tampermonkey:  
**Works only if you have 2FA Turned off.**
Click on [this link](./tampermonkey/print_token.user.js?raw=1), and Tampermonkey should prompt you to install the user script. Click on Install. Now, go back to r/place and refresh the page. After a while, an alert with your TOKEN should appear; copy and save it somewhere.
![token_alert](https://user-images.githubusercontent.com/539452/161394556-09c14efe-9f1d-4511-92bc-682100f34043.jpg)
 
### Using dev-tools ion browser:  
In the browser, open the developer tools, switch to the network tab, reload r/place, and in the request to /r/place, find "accessToken":<token> in the response. Copy the token and use it as a parameter in the headless bot.
 
https://user-images.githubusercontent.com/35738060/161390213-d7f8354c-a97d-4a0f-9442-f33ba84941ba.mp4
 
Video credit - fuho#7423
Linux Install Script Credit - Madeline#6969
