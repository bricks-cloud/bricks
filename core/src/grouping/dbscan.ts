export class DBSCAN {
  private visited: boolean[] = [];
  private assigned: boolean[] = [];

  dataset: number[][];
  epsilon: number = 0;
  minPts: number = 0;

  // index to data points
  clusters: number[][] = [];
  noise: number[] = [];

  constructor(dataset: number[][]) {
    this.dataset = dataset;
    this.validateDataset();
  }

  private validateDataset() {
    const dataDimensions = new Set(this.dataset.map((data) => data.length));
    if (dataDimensions.size > 1) {
      throw new Error(
        `Data points should have the same dimension. Found dimensions: ${Array.from(
          dataDimensions
        )}.`
      );
    }
  }

  run({ epsilon, minPts }: { epsilon: number; minPts: number }) {
    this.visited = Array(this.dataset.length).fill(false);
    this.assigned = Array(this.dataset.length).fill(false);

    this.epsilon = epsilon;
    this.minPts = minPts;

    this.clusters = [];
    this.noise = [];

    for (let index = 0; index < this.dataset.length; index++) {
      if (this.visited[index] === false) {
        this.visited[index] = true;

        const neighbors = this.regionQuery(index);

        if (neighbors.length < this.minPts) {
          // if closest neighborhood is too small to form a cluster, mark as noise
          this.noise.push(index);
        } else {
          // create new cluster and add point
          const clusterId = this.clusters.length;
          this.clusters.push([]);
          this.addToCluster(index, clusterId);

          this.expandCluster(clusterId, neighbors);
        }
      }
    }

    return this.clusters;
  }

  private getEuclideanDistance(first: number[], second: number[]) {
    let sum = 0;

    for (let i = 0; i < first.length; i++) {
      sum += (first[i] - second[i]) ** 2;
    }

    return Math.sqrt(sum);
  }

  private regionQuery(currentIndex: number): number[] {
    const neighbors: number[] = [];

    for (let otherIndex = 0; otherIndex < this.dataset.length; otherIndex++) {
      const distance = this.getEuclideanDistance(
        this.dataset[currentIndex],
        this.dataset[otherIndex]
      );

      if (distance < this.epsilon) {
        neighbors.push(otherIndex);
      }
    }

    return neighbors;
  }

  private addToCluster(dataIndex: number, clusterId: number) {
    this.clusters[clusterId].push(dataIndex);
    this.assigned[dataIndex] = true;
  }

  private expandCluster(clusterId: number, neighbors: number[]) {
    /**
     * It's very important to calculate length of neighbors array each time,
     * as the number of elements changes over time
     */
    for (let i = 0; i < neighbors.length; i++) {
      let pointIndex = neighbors[i];

      if (this.visited[pointIndex] === false) {
        this.visited[pointIndex] = true;
        let newNeighbors = this.regionQuery(pointIndex);

        if (newNeighbors.length >= this.minPts) {
          // merge arrays and remove duplicates
          neighbors = Array.from(new Set(neighbors.concat(newNeighbors)));
        }
      }

      // add to cluster
      if (this.assigned[pointIndex] === false) {
        this.addToCluster(pointIndex, clusterId);
      }
    }
  }
}
