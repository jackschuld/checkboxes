# check-pixels
Simple web app to learn more about web sockets and practice algorithms with fast loading

About:

✓ Websocket communication between client and server using SignalR
✓ Static HTML + JavaScript for increased rendering performance
✓ Dependency free 

During development, my browser crashed numerous times. To improve the performance from my original script.js to where it is now, I added:
✓ Throttling to the rendering request
✓ DOM Recycling - moved away from original checkbox create/destroy approach
✓ Reducing number of checkboxes in view at a time