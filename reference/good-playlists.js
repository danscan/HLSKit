Replay:
=======

SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
0     10          N                 0     0
1     20          N                 0     1
2     30          N                 0     2
3     40          N                 0     3
                  Y
4     10          N                 1(-1) 4(-1)
                  Y
5     10          N                 2(1)  5
6     20          N                 2(1)  6
                  Y
7     10          N                 3(-1) 7(-1)
                  Y
8     10          N                 4(2)  8
9     20          N                 4(2)  9
10    30          N                 4(2)  10
                  Y
11    10          N                 5(-1) 11(-1)
                  Y
12    10          N                 6(3)  12
13    20          N                 6(3)  13
14    30          N                 6(3)  14
15    40          N                 6(3)  15



Sliding-Window Live:
====================
Displayed in 10-sec intervals

#MSEQ:0
#DSEQ:0
SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
0     10          N                 0     0


#MSEQ:0
#DSEQ:0
SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
0     10          N                 0     0
1     20          N                 0     1


#MSEQ:0
#DSEQ:0
SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
0     10          N                 0     0
1     20          N                 0     1
2     30          N                 0     2


#MSEQ:1
#DSEQ:0
SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
1     20          N                 0     1
2     30          N                 0     2
3     40          N                 0     3


(unchanged!)
#MSEQ:1
#DSEQ:0
SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
1     20          N                 0     1
2     30          N                 0     2
3     40          N                 0     3


#MSEQ:2
#DSEQ:0
SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
2     30          N                 0     2
3     40          N                 0     3
                  Y
5     10          N                 1     4


#MSEQ:3
#DSEQ:0
SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
3     40          N                 0     3
                  Y
5     10          N                 1     4
6     20          N                 1     5


(unchanged!)
#MSEQ:3
#DSEQ:0
SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
3     40          N                 0     3
                  Y
5     10          N                 1     4
6     20          N                 1     5


#MSEQ:4
#DSEQ:0
SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
                  Y
5     10          N                 1     4
6     20          N                 1     5
                  Y
8     10          N                 2     6


#MSEQ:5
#DSEQ:1
SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
6     20          N                 1     5
                  Y
8     10          N                 2     6
9     20          N                 2     7


#MSEQ:6
#DSEQ:1
SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
                  Y
8     10          N                 2     6
9     20          N                 2     7
10    30          N                 2     8


(unchanged!)
#MSEQ:6
#DSEQ:1
SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
                  Y
8     10          N                 2     6
9     20          N                 2     7
10    30          N                 2     8


#MSEQ:7
#DSEQ:2
SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
9     20          N                 2     7
10    30          N                 2     8
                  Y
12    10          N                 3     9


#MSEQ:8
#DSEQ:2
SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
10    30          N                 2     8
                  Y
12    10          N                 3     9
13    20          N                 3     10


#MSEQ:9
#DSEQ:2
SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
                  Y
12    10          N                 3     9
13    20          N                 3     10
14    30          N                 3     11


#MSEQ:10
#DSEQ:3
SEQ   ELAPSED     DISCONTINUITY     DSEQ  MSEQ
13    20          N                 3     10
14    30          N                 3     11
15    40          N                 3     12
#EXT-X-ENDLIST
