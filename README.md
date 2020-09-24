This project is an unholy agglomeration of react, electron, tensorflow, and zerorpc -- held together by post-it note glue and surface tension.

## Installation


### Building from source

Needed: 
    
    Node
    Python>=3.6
    git

Create a folder and in a terminal run

    git clone https://github.com/BenjaminMidtvedt/DeepTrack-app .
 
Then run
    
    npm install

followed by

    pip install numpy
    pip install -r requirements.txt
    
Note that numpy needs to be installed first, because scikit-image currently have some issues with installing if it isn't installed first.

One this is done, run, in order,

    npm run build
    npm run build-server

This will create the production version of the app. Now it can be run with

    npm run start-prod
