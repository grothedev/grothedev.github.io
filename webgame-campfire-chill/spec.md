a multiplayer game where the main screen is a 2D canvas that shows a generated world similar to rimworld or moonring. it runs in a web browser.

the main idea is the following:
    - players can establish a home, explore the world, and interact with each other.
    - the gameplay is time-bound, in that each in game day takes 1 hour in real time.
    - there are some actions that can only be done once per day
    - there are some actions that can be done unlimited times per day
    - there is a maximum range or area that each player can traverse in one day
    - there are events that are associated with times of day and days of the month
    - there is a chat input box where players can type messages that will show up in speech bubbles next to their character
    - chat bubbles can only be read by other players within some distance, and there is a fade-out zone where the text becomes more difficult to read or incomplete as distance increases
    - activities take some amount of time proportional to how long it would take in real time.
    - some activities that can be performed: build a house, farm garden plot, fishing, build a car, travel somewhere, dance, play an instrument,
    - there is an audio player that can stream audio from player input

technical details:
    - use websockets

