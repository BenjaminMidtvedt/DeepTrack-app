import zerorpc
import gevent, signal
from python_api import PyAPI

port = 2734
addr = 'tcp://127.0.0.1:' + str(port)
s = zerorpc.Server(PyAPI())
s.bind(addr)
gevent.signal(signal.SIGTERM, s.stop)
gevent.signal(signal.SIGINT, s.stop)  # ^C

s.run()

