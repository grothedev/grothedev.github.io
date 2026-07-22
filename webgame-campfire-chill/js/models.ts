interface player {
	activityState: PlayerState,
	position: Position,
	hp: number
}

enum PlayerState {
	Default,
	Offline,
	Idle,
	Walking,
	Dialogue
}

