#!/usr/bin/env bash
DIR=./public/images/
#convert -crop 330x400+100+50 ~/Downloads/slot-machine2.jpg ${DIR}sym0.png
#convert -crop 330x400+100+470 ~/Downloads/slot-machine2.jpg ${DIR}sym1.png
#convert -crop 330x400+100+880 ~/Downloads/slot-machine2.jpg ${DIR}sym2.png
#convert -crop 330x400+450+40 ~/Downloads/slot-machine2.jpg ${DIR}sym3.png
#convert -crop 330x400+430+460 ~/Downloads/slot-machine2.jpg ${DIR}sym4.png
#convert -crop 330x400+415+870 ~/Downloads/slot-machine2.jpg ${DIR}sym5.png
#convert -crop 330x400+775+50 ~/Downloads/slot-machine2.jpg ${DIR}sym6.png
#convert -crop 330x400+780+470 ~/Downloads/slot-machine2.jpg ${DIR}sym7.png
#convert -crop 330x400+750+880 ~/Downloads/slot-machine2.jpg ${DIR}sym8.png

SIZE=165x160
#for i in 0 1 2 3 4 5 6 7 8 0 1; do convert ${DIR}fsym${i}.png -background black -gravity center -extent ${SIZE} ${DIR}xsym${i}.png; done
for i in 0 1 2 3 4 5 6 7 8 0 1; do convert ${DIR}sym${i}.png -crop ${SIZE}+0+20 ${DIR}sym${i}.png; done

R=""
for i in 0 1 2 3 4 5 6 7 8 0 1; do R="${R} ${DIR}sym${i}.png"; done
convert ${R} -append ${DIR}reel0.png
R=""
for i in 0 2 4 6 8 1 3 5 7 0 2; do R="${R} ${DIR}sym${i}.png"; done
convert ${R} -append ${DIR}reel1.png
R=""
for i in 0 3 6 1 4 7 2 5 8 0 3; do R="${R} ${DIR}sym${i}.png"; done
convert ${R} -append ${DIR}reel2.png

#convert -size 330x400 xc:black ${DIR}symx.png
convert -size ${SIZE} xc:black ${DIR}symx.png
