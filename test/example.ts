import { time, loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import { ethers } from "hardhat";
import { groth16 } from "snarkjs";

const wasm_tester = require("circom_tester").wasm;

const F1Field = require("ffjavascript").F1Field;
const Scalar = require("ffjavascript").Scalar;
exports.p = Scalar.fromString("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const Fr = new F1Field(exports.p);

describe("Example", function () {
  let Verifier;
  let verifier;

  async function deploy() {
    Verifier = await ethers.getContractFactory("ExampleVerifier");
    verifier = await Verifier.deploy();
    await verifier.deployed();

    return { verifier, Verifier };
  }

  describe("Deployment", function () {
    it("Should set the right unlockTime", async function () {

      const circuit = await wasm_tester("circuits/example.circom");

      // Construct the input
      const input = {
        "in": 15,
        "range": [10, 20]
      }

      // Calculate the witness
      const witness = await circuit.calculateWitness(input, true);
      console.log(witness)

      //console.log(witness);

      expect(Fr.eq(Fr.e(witness[0]), Fr.e(1)));
      expect(Fr.eq(Fr.e(witness[1]), Fr.e(1)));
    });

    it("Should return true for correct proof", async function () {
      const { verifier } = await loadFixture(deploy);


      const input = {
        "in": 15,
        "range": [10, 20]
      }

      const { proof, publicSignals } = await groth16.fullProve(input, "circuits/example.wasm", "circuits/example.zkey");

      const calldata = await groth16.exportSolidityCallData(proof, publicSignals);

      const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());

      const a = [argv[0], argv[1]];
      const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
      const c = [argv[6], argv[7]];
      const Input = argv.slice(8);

      expect(await verifier.verifyProof(a, b, c, Input)).to.be.true;
    });

    it("Should return false for invalid proof", async function () {
      const { verifier } = await loadFixture(deploy);

      let a = [0, 0];
      let b = [[0, 0], [0, 0]];
      let c = [0, 0];
      let d = [0]
      expect(await verifier.verifyProof(a, b, c, d)).to.be.false;
    });

  });

});
