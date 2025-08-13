this is a system status info webpage that is used as my new tab page. it shows the status of various services running on the host system and other computers on my local network.

services:
	- filesync
		- watches a number of directories for modifications and keeps the files in sync between hosts. 
		- TODO
	- networkmonitor:
		- 
	- website
		- https://belthelziquor.com
	- nodejs services
		- TODO 
		-
		
UI:
	- boxes for each service that provide some options for interfacing with the service and viewing more details
	-

the entire webapp downloads and stores an application in the users localstorage.
if connection lost, user can still interact with the website services while offline.
in addition, other users who are on the same network can still use the webapp if it was downloaded to their localstorage. 