:startover
rem *** Turn on always required coils.  Do twice with timeout to work around occassional fail in cli.py.
call alloff.bat
call alloff.bat
call on.bat 98 16
call on.bat 98 32
timeout -t 2
call on.bat 98 16
call on.bat 98 32

rem *** TURN ON DISTRICTS IN SEQUENCE L to R, with delay.
rem * Stadium
call on.bat 98 72
call on.bat 98 72
timeout -t 2

rem * Front
call on.bat 98 48
call on.bat 81 16
call on.bat 81 32
call on.bat 98 48
call on.bat 81 16
call on.bat 81 32
timeout -t 2

rem * Helipad
call on.bat 98 64
call on.bat 98 64
timeout -t 2

rem * Train
call on.bat 98 40
call on.bat 98 40
timeout -t 2

rem * Vertiport, Ferris Wheel
call on.bat 98 48
call on.bat 82 16
call on.bat 82 32
call on.bat 98 48
call on.bat 82 16
call on.bat 82 32

rem * Wait
timeout -t 8

rem * FLASH ON AND OFF
call alloff.bat
call alloff.bat
timeout -t 1
call allon.bat
call allon.bat
timeout -t 1
call alloff.bat
call alloff.bat
timeout -t 1
call allon.bat
call allon.bat
timeout -t 1
call alloff.bat
call alloff.bat
timeout -t 1
call allon.bat
call allon.bat
timeout -t 1
call alloff.bat
call alloff.bat
timeout -t 1
call allon.bat
call allon.bat
timeout -t 1
call alloff.bat
call alloff.bat
timeout -t 1
call allon.bat
call allon.bat
timeout -t 1

* rem WAIT
timeout -t 8

rem *** Turn on always required coils.  Do twice with timeout to work around occassional fail in cli.py.
call alloff.bat
call alloff.bat
call on.bat 98 16
call on.bat 98 32
timeout -t 2
call on.bat 98 16
call on.bat 98 32

rem * ALTERNATING
call off.bat 81 16
call off.bat 81 32
call off.bat 98 40
call off.bat 81 16
call off.bat 81 32
call off.bat 98 40
timeout -t 2
call on.bat 81 16
call on.bat 81 32
call on.bat 98 40
call on.bat 81 16
call on.bat 81 32
call on.bat 98 40

rem
call off.bat 98 72
call off.bat 98 64
call off.bat 82 16
call off.bat 82 32
call off.bat 98 72
call off.bat 98 64
call off.bat 82 16
call off.bat 82 32
timeout -t 2
call on.bat 98 72
call on.bat 98 64
call on.bat 82 16
call on.bat 82 32
call on.bat 98 72
call on.bat 98 64
call on.bat 82 16
call on.bat 82 32

rem * WAIT
timeout -t 8

goto :startover
