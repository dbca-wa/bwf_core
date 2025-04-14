from queue import Queue


class QueueController:

    @staticmethod
    def initialize_queue():
        return QueueController()

    def __init__(self, queue):
        self.queue = Queue()

    def add(self, item):
        self.queue.put(item)

    def get(self):
        return self.queue.get()

    def empty(self):
        return self.queue.empty()

    def size(self):
        return self.queue.qsize()
