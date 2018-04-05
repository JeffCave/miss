# Programmatic Similiarity Checker

Based on the work of CheckSim, this project is not a novel
implementation of any similarity checking algorithm. Rather this
project is an attempt to create a simplified, and generic, user
interface to existing algorithms.

## Barriers

Specifically, there are several barriers to entry that exist for
faculty members attempting to ensure academic integrity by using
automated detection algorithms.

1. Complexity
2. Accesibility
3. Legality
4. Reliability

### Complexity



### Accesibility



### Legality

Some institutions have strict guidelines regarding transmission of
student information. Privacy laws, data gathering, and copyright all
play a role into what may be shared, and what may be transmitted off
school computers. Of particular concern is the legality of
transmitting data across international boundaries.

In countries, such as Canada, transmission of student data to the US
is often forbidden. Unfortunately, transmission of the student
assignment to a computer in the USA is blocked by administration.
This precludes the use of tools such as GitHub, AWS, Google Cloud, or
(in this case) MOSS.

To overcome this barrier, faculty can engage in manual sanitization
of student assignments by manually removing their name and student ID
from the assignment. This solution comes at a significant effort cost.

Alternately, the facutly may opt ot download an existing Open Source
solution. Again a high burden is placed on the faculty member in that
they must download, compile, and maintain a local service for
consitent departmental use. This is compounded by not all processors
being suitable to all languages.

### Reliability

Since 1997, MOSS has been the defacto standard for software
similarity testing. As a SASS product, users are dependent on the
server's reliability. Unfortunately, the MOSS server is *often*
unavavailable. Further, as a free product, one can hardly hold its maintainers
accountable for their charitable system not being available at any
given moment.

Unfortunately, for faculty looking to develop a consistent workflow,
reliability is paramount.

## Solution

A single-page web app has the ability to solve many of the issues identified.

By being loaded locally into the user's browser, we remove all concerns regarding unsecure transmission. All processing occurs on the faculty member's computer. This is a significantly easier mechanism for deploying the application than having to build the application.

By removing the server
side processing, hosting requirements are reduced, allowing for
high-reliability static hosting services such as "GitLab Pages" to be
used. Further, by not having any server-side requirements, the user
only need rely on their own computer and browser: the ability to
execute a check is as reliable as the ability to access a webpage.

In the event that trust in the provider is lost, it is easily possible for the user to download and run the entire application from their own computer.

# How to Cheat

In particular, I would not use this project as a reference since I
cannot speak to the effectiveness of *any* algorithm. This project
does not include any studies into the effectiveness of any particular
algorithm, nor any research into what makes an effective algorithm.

If you are attempting to study this in an effort to avoid being
identified as having your work be similar to someone else's, I
suggest the following:

[How to Cheat in Computer Science 101](https://github.com/genchang1234/How-to-cheat-in-computer-science-101)

